import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SanitizedUser } from '../../db/entities/users/user.entity';
import { AuthProvider } from '../../db/entities/auth/auth-provider.entity';
import * as bcrypt from 'bcrypt';
import { JWTPayload, AuthResponse, RegisterRequest } from './auth.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { Request, Response } from 'express';
import { ValidatedConfig } from '../../const/config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  #logger = new ContextLogger(this.constructor.name);
  readonly #cookieName: string;
  #cookieOptions: ValidatedConfig['auth']['session']['cookie'];

  constructor(
    private configService: ConfigService<ValidatedConfig, true>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthProvider)
    private readonly authProviderRepository: Repository<AuthProvider>,
    private readonly jwtService: JwtService,
  ) {
    const sessionOpts = this.configService.get('auth.session', { infer: true });
    this.#cookieOptions = sessionOpts.cookie;
    this.#cookieName = sessionOpts.cookieName;
  }

  /**
   * 1. Clears session cookie, sends response header, careful when using with `@Res({ passthrough: true })`, you cannot set more headers
   * 2. Logs out the passport session
   * 3. Destroys the session
   * 4. The Request.user reference is deleted
   */
  async performLogout(req: Request, res: Response): Promise<void> {
    const sessionId = req.sessionID;
    const userEmail = req.user?.email;

    this.#logger.log(`Attempting logout for ${userEmail || 'unknown user'} (Session ID: ${sessionId})`);

    // 1. Clear the session cookie
    res.clearCookie(this.#cookieName, {
      path: this.#cookieOptions.path,
      httpOnly: this.#cookieOptions.httpOnly,
      secure: this.#cookieOptions.secure,
      sameSite: this.#cookieOptions.sameSite,
    });
    this.#logger.debug(`Cleared cookie ${this.#cookieName} for ${userEmail || 'unknown user'}.`);

    // 2. Log out from Passport session
    await new Promise<void>((resolve, reject) => {
      req.logOut((err) => {
        if (err) {
          this.#logger.error(`Error during Passport logout for ${userEmail || 'unknown user'}`, err);
          // Reject with a standard NestJS exception if desired
          return reject(new InternalServerErrorException('Passport logout failed.'));
        }
        this.#logger.debug(`Passport logout successful for ${userEmail || 'unknown user'}.`);
        resolve();
      });
    });

    // 3. Destroy the session data in the store
    await new Promise<void>((resolve, reject) => {
      if (!req.session) {
        this.#logger.warn(
          `Logout attempt for ${userEmail || 'unknown user'} without an active session (ID: ${sessionId}).`,
        );
        return resolve(); // Nothing to destroy, proceed
      }
      req.session.destroy((err) => {
        if (err) {
          this.#logger.error(`Error destroying session ${sessionId} for ${userEmail || 'unknown user'}`, err);
          return reject(new InternalServerErrorException('Session destruction failed.'));
        }
        this.#logger.debug(`Session ${sessionId} destroyed successfully for ${userEmail || 'unknown user'}.`);
        resolve();
      });
    });

    this.#logger.log(
      `Logout process completed successfully for ${userEmail || 'unknown user'} (Session ID: ${sessionId})`,
    );
  }

  async validateLocalUser(email: string, password: string) {
    try {
      const authProvider = await this.authProviderRepository.findOne({
        where: { provider: 'local', user: { email: email } },
        relations: { user: true },
        select: {
          id: true,
          userId: true,
          provider: true,
          passwordHash: true,
          user: {
            id: true,
            email: true,
            displayName: true,
            picture: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      });

      if (!authProvider || !authProvider.passwordHash) {
        this.#logger.warn(`Local auth attempt for non-existent user or non-local provider: ${email}`);
        return null;
      }

      const isPasswordMatching = await bcrypt.compare(password, authProvider.passwordHash);
      if (isPasswordMatching) {
        if (!authProvider.user) {
          this.#logger.error(`User relation not loaded for AuthProvider ${authProvider.id} during local validation.`);
          return null;
        }

        return this.sanitizeUser(authProvider.user);
      }

      this.#logger.warn(`Invalid password attempt for: ${email}`);
      return null;
    } catch (error) {
      this.#logger.error(`Error during local user validation for ${email}`, error as Error);

      return null;
    }
  }

  async createOrUpdateUserOAuth(
    providerId: string,
    provider: string,
    email: string,
    displayName: string,
    picture: string | null,
  ): Promise<SanitizedUser> {
    try {
      const {
        generatedMaps: [linkedUser],
      } = await this.userRepository
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          email,
          displayName: displayName,
          picture: picture,
        })
        .orUpdate(['displayName', 'picture'], ['email'])
        .execute();

      await this.authProviderRepository
        .createQueryBuilder()
        .insert()
        .into(AuthProvider)
        .values({
          userId: linkedUser.id,
          provider,
          providerId,
          passwordHash: null,
        })
        .orIgnore()
        .execute();

      return this.sanitizeUser(linkedUser as User);
    } catch (error) {
      this.#logger.error(`Error in createOrUpdateUserOAuth for ${provider} user ${email}`, error as Error);
      throw new InternalServerErrorException('Authentication failed during OAuth processing.');
    }
  }

  async registerLocalUser(registerDto: RegisterRequest): Promise<SanitizedUser> {
    const { email, password, displayName } = registerDto;
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      const existingLocalProvider = await this.authProviderRepository.findOne({
        where: { userId: existingUser.id, provider: 'local' },
      });

      if (existingLocalProvider) {
        throw new ConflictException(`User with email ${email} already registered locally.`);
      }

      throw new ConflictException(
        `Email ${email} is already associated with an existing account. Try logging in or use a different email.`,
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let savedUser: User;
    try {
      const newUser = this.userRepository.create({
        email,
        displayName: displayName?.trim() || email.split('@')[0],
        picture: null,
      });
      savedUser = await this.userRepository.save(newUser);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error?.code === '23505') {
        this.#logger.warn(`Registration failed due to race condition for email: ${email}`);
        throw new ConflictException(`Email ${email} is already registered. Please try logging in.`);
      }

      this.#logger.error(`Error creating user during registration for ${email}`, error as Error);
      throw new InternalServerErrorException('Failed to create user account.');
    }
    try {
      const newLocalProvider = this.authProviderRepository.create({
        userId: savedUser.id,
        provider: 'local',
        providerId: null,
        passwordHash: hashedPassword,
      });
      await this.authProviderRepository.save(newLocalProvider);
    } catch (error) {
      this.#logger.error(
        `Failed to create local auth provider for user ${savedUser.id} after user creation. User is orphaned.`,
        error as Error,
      );

      throw new InternalServerErrorException('Failed to finalize user registration. Please try again later.');
    }

    this.#logger.log(`Registered new local user: ${email} (ID: ${savedUser.id})`);
    return this.sanitizeUser(savedUser);
  }

  async login(user: Partial<User>): Promise<AuthResponse> {
    if (!user || !user.id || !user.email) {
      this.#logger.error('Attempted to login with invalid user object structure', user);
      throw new UnauthorizedException('Invalid user data provided for login.');
    }

    const payload: JWTPayload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
    };
  }

  async validateUserById(userId: string): Promise<SanitizedUser | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      this.#logger.error(`Error validating user by ID ${userId} from JWT`, error as Error);
      return null;
    }
  }

  sanitizeUser(user: User): SanitizedUser {
    if (!user) return user;

    const sanitized: SanitizedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      picture: user.picture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return sanitized;
  }
}
