import {
  Controller,
  Req,
  Post,
  UnauthorizedException,
  UseGuards,
  Get,
  Res,
  HttpStatus,
  Query,
  HttpCode,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BaseRequest, LoginRequest, RegisterRequest } from './auth.entity';
import { Response } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleOAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { FacebookOAuthGuard } from './guards/facebook-auth.guard';
import { GithubOAuthGuard } from './guards/github-auth.guard';

@ApiTags('api', 'auth')
@Controller('/api/auth')
export class AuthController {
  #logger = new ContextLogger(this.constructor.name);
  readonly #cookieName: string;
  #cookieOptions: ValidatedConfig['auth']['session']['cookie'];

  constructor(
    private configService: ConfigService<ValidatedConfig, true>,
    private authService: AuthService,
  ) {
    const sessionOpts = this.configService.get('auth.session', { infer: true });
    this.#cookieOptions = sessionOpts.cookie;
    this.#cookieName = sessionOpts.cookieName;
  }

  get cookieOptions() {
    return {
      ...this.#cookieOptions,
      expires: new Date(this.#cookieOptions.maxAge),
    };
  }

  @UseGuards(new LocalAuthGuard(LoginRequest))
  @Post('login')
  @ApiOperation({ summary: 'Login user via email/password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: SanitizedUser })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: LoginRequest })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(@Req() req: BaseRequest, @Res({ passthrough: true }) _res: Response): Promise<SanitizedUser> {
    this.#logger.debug('User logged in via Local Strategy', {
      sessionId: req.sessionID,
      sessionKeys: req.session ? Object.keys(req.session) : 'No Session',
    });
    return req.user;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with email/password' })
  @ApiResponse({ status: 201, description: 'User successfully registered.', type: SanitizedUser })
  @ApiResponse({ status: 400, description: 'Invalid registration data (validation errors)' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(
    @Body() registerDto: RegisterRequest,
    @Req() req: BaseRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Res({ passthrough: true }) _res: Response,
  ): Promise<SanitizedUser> {
    const user = await this.authService.registerLocalUser(registerDto);

    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          this.#logger.error(`Error logging in user ${user.email} after registration`, err);
          return reject(new UnauthorizedException('Could not log in user after registration'));
        }
        this.#logger.log(`User registered and session established for ${user.email}`);
        resolve();
      });
    });
    this.#logger.log(`User registered ${user.email}`);
    return user;
  }

  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google for authentication' })
  async loginGoogle() {
    // Passport strategy handles the redirect.
    return HttpStatus.FOUND;
  }

  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth2 callback URL' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token after successful login' })
  @ApiExcludeEndpoint()
  async googleAuthCallback(
    @Req() req: BaseRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('state') state?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('No user data received from Google validation.');
    }

    const redirectUrl = `${req.secure ? 'https://' : 'http://'}${req.headers.host}`;
    try {
      res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.#logger.error('Failed during redirect after Google login', error as Error, { state });
      if (!res.headersSent) {
        res.status(500).send({ message: 'Login successful, but failed to redirect.' });
      }
    }
  }

  @UseGuards(FacebookOAuthGuard)
  @Get('facebook')
  @ApiOperation({ summary: 'Initiate Facebook OAuth2 login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook for authentication' })
  async loginFacebook() {
    // Passport strategy handles the redirect.
    return HttpStatus.FOUND;
  }

  @UseGuards(FacebookOAuthGuard)
  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth2 callback URL' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token after successful login' })
  @ApiExcludeEndpoint()
  async facebookAuthCallback(
    @Req() req: BaseRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('state') state?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('No user data received from Facebook validation.');
    }

    const redirectUrl = `${req.secure ? 'https://' : 'http://'}${req.headers.host}`;
    try {
      res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.#logger.error('Failed during redirect after Facebook login', error as Error, { state });
      if (!res.headersSent) {
        res.status(500).send({ message: 'Login successful, but failed to redirect.' });
      }
    }
  }

  @UseGuards(GithubOAuthGuard)
  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 login flow' })
  @ApiResponse({ status: 302, description: 'Redirects to GitHub for authentication' })
  async loginGitHub() {
    // Passport strategy handles the redirect.
    return HttpStatus.FOUND;
  }

  @UseGuards(GithubOAuthGuard)
  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth2 callback URL' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token after successful login' })
  @ApiExcludeEndpoint()
  async gitHubAuthCallback(
    @Req() req: BaseRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('state') state?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('No user data received from GitHub validation.');
    }

    const redirectUrl = `${req.secure ? 'https://' : 'http://'}${req.headers.host}`;
    try {
      res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.#logger.error('Failed during redirect after GitHub login', error as Error, { state });
      if (!res.headersSent) {
        res.status(500).send({ message: 'Login successful, but failed to redirect.' });
      }
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 500, description: 'Logout failed' })
  async logout(@Req() req: BaseRequest, @Res({ passthrough: false }) res: Response) {
    const sessionId = req.sessionID;
    const userEmail = req.user?.email;

    try {
      res.clearCookie(this.#cookieName, {
        path: this.#cookieOptions.path,
        httpOnly: this.#cookieOptions.httpOnly,
        secure: this.#cookieOptions.secure,
        sameSite: this.#cookieOptions.sameSite,
      });

      await new Promise<void>((resolve, reject) => {
        req.logOut((err) => {
          if (err) {
            this.#logger.error(`Error during Passport logout for ${userEmail || 'unknown user'}`, err);
            return reject(err);
          }
          this.#logger.log(`Passport logout successful for ${userEmail || 'unknown user'}.`);
          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        if (!req.session) {
          this.#logger.warn(
            `Logout attempt for ${userEmail || 'unknown user'} without an active session (ID: ${sessionId}).`,
          );
          return resolve();
        }
        req.session.destroy((err) => {
          if (err) {
            this.#logger.error(`Error destroying session ${sessionId} for ${userEmail || 'unknown user'}`, err);
            return reject(err);
          } else {
            this.#logger.log(`Session ${sessionId} destroyed successfully for ${userEmail || 'unknown user'}.`);
          }

          resolve();
        });
      });

      res.status(HttpStatus.OK).send({ message: 'Logged out successfully' });
    } catch (error) {
      this.#logger.error(
        `Logout process failed for ${userEmail || 'unknown user'} (Session ID: ${sessionId})`,
        error as Error,
      );
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Logout failed.' });
      }
    }
  }
}
