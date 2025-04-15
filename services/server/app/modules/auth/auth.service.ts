import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, SanitizedUser } from '../../db/entities/users/user.entity';
import { AuthProvider } from '../../db/entities/auth/auth-provider.entity';
import * as bcrypt from 'bcrypt';
import { JWTPayload, AuthResponse, RegisterRequest } from './auth.entity';

@Injectable()
export class AuthService {
  #logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthProvider)
    private readonly authProviderRepository: Repository<AuthProvider>,
    private readonly jwtService: JwtService,
  ) {}

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
      this.#logger.error(
        `Error during local user validation for ${email}`,
        error instanceof Error ? error.stack : error,
      );

      return null;
    }
  }

  async findOrCreateUserFromOAuth(
    providerId: string,
    provider: string,
    email: string,
    displayName: string,
    picture: string | null,
  ): Promise<SanitizedUser> {
    try {
      const existingProvider = await this.authProviderRepository.findOne({
        where: { provider, providerId },
        relations: { user: true },
      });

      if (existingProvider) {
        if (!existingProvider.user) {
          this.#logger.error(`User relation not loaded for existing AuthProvider ${existingProvider.id} during OAuth.`);
          throw new InternalServerErrorException('Failed to load user details during OAuth.');
        }
        const user = existingProvider.user;
        let needsUpdate = false;
        const updatedUser: Partial<User> = {};

        if (user.displayName !== displayName) {
          updatedUser.displayName = displayName;
          needsUpdate = true;
        }
        if (picture && user.picture !== picture) {
          updatedUser.picture = picture;
          needsUpdate = true;
        }

        if (needsUpdate) {
          this.#logger.log(`Updating profile for user ${user.id} from ${provider} OAuth.`);
          const userToSave = Object.assign(new User(), user, updatedUser);
          const savedUser = await this.userRepository.save(userToSave);
          return this.sanitizeUser(savedUser);
        }

        return this.sanitizeUser(user);
      }

      let userToLink = await this.userRepository.findOne({ where: { email } });
      if (!userToLink) {
        this.#logger.log(`Creating new user and ${provider} link for email: ${email}`);
        const newUserEntity = this.userRepository.create({
          email,
          displayName: displayName,
          picture: picture,
        });
        userToLink = await this.userRepository.save(newUserEntity);
      }

      const newProviderLink = this.authProviderRepository.create({
        userId: userToLink.id,
        provider,
        providerId,
        passwordHash: null,
      });
      await this.authProviderRepository.save(newProviderLink);

      return this.sanitizeUser(userToLink);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error?.code === '23505') {
        this.#logger.warn(
          `OAuth Validation: Possible race condition or constraint violation for ${email} / ${provider}:${providerId}. Attempting recovery.`,
          error.message,
        );

        const finalUser = await this.findUserByProviderOrEmail(provider, providerId, email);
        if (finalUser) {
          return this.sanitizeUser(finalUser);
        }

        throw new ConflictException(`Failed to link or create account due to existing constraints for ${email}.`);
      }

      this.#logger.error(
        `Error in findOrCreateUserFromOAuth for ${provider} user ${email}`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException('Authentication failed during OAuth processing.');
    }
  }

  private async findUserByProviderOrEmail(provider: string, providerId: string, email: string): Promise<User | null> {
    const providerLink = await this.authProviderRepository.findOne({
      where: { provider, providerId },
      relations: { user: true },
    });
    if (providerLink?.user) {
      this.#logger.log(`Recovered user ${providerLink.user.id} via provider link ${provider}:${providerId}`);
      return providerLink.user;
    }

    this.#logger.log(`Provider link not found for recovery, trying email ${email}`);
    const userByEmail = await this.userRepository.findOne({ where: { email } });
    if (userByEmail) {
      this.#logger.log(`Recovered user ${userByEmail.id} via email ${email}`);
    }
    return userByEmail;
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

      this.#logger.error(
        `Error creating user during registration for ${email}`,
        error instanceof Error ? error.stack : error,
      );
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
        error instanceof Error ? error.stack : error,
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
      this.#logger.error(
        `Error validating user by ID ${userId} from JWT`,
        error instanceof Error ? error.stack : error,
      );
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
