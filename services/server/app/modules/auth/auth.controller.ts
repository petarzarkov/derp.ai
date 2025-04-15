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
  Logger,
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

@ApiTags('api', 'auth')
@Controller('/api/auth')
export class AuthController {
  #logger = new Logger(this.constructor.name);
  #cookieOptions: ValidatedConfig['auth']['session']['cookie'];

  constructor(
    private configService: ConfigService<ValidatedConfig, true>,
    private authService: AuthService,
  ) {
    const cookie = this.configService.get('auth.session.cookie', { infer: true });
    this.#cookieOptions = cookie;
  }

  get cookieOptions() {
    return {
      ...this.#cookieOptions,
      expires: new Date(this.#cookieOptions.maxAge),
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with email/password' })
  @ApiResponse({ status: 201, description: 'User successfully registered.', type: SanitizedUser })
  @ApiResponse({ status: 400, description: 'Invalid registration data (validation errors)' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(
    @Body() registerDto: RegisterRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUser> {
    const user = await this.authService.registerLocalUser(registerDto);
    const loginResponse = await this.authService.login(user);
    const token = loginResponse.accessToken;

    res.cookie('access_token', token, this.cookieOptions);
    this.#logger.log(`User registered and cookie set for ${user.email}`);
    return user;
  }

  @UseGuards(new LocalAuthGuard(LoginRequest))
  @Post('login')
  @ApiOperation({ summary: 'Login user via email/password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: SanitizedUser })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: LoginRequest })
  async login(@Req() req: BaseRequest, @Res({ passthrough: true }) res: Response): Promise<SanitizedUser> {
    const user = req.user;
    const loginResponse = await this.authService.login(user);
    const token = loginResponse.accessToken;

    res.cookie('access_token', token, this.cookieOptions);
    this.#logger.log(`User logged in and cookie set for ${user.email}`);
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

    // User is validated and attached by GoogleOAuthGuard/GoogleStrategy
    const loginResponse = await this.authService.login(req.user);
    const token = loginResponse.accessToken;
    const redirectUrl = `${req.secure ? 'https://' : 'http://'}${req.headers.host}`;

    try {
      res.cookie('access_token', token, this.cookieOptions);
      res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (cookieError) {
      this.#logger.error('Failed to set cookie', cookieError, state);
      res.status(500).send({ message: 'Login successful, but failed to set cookie.' });
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 500, description: 'Logout failed' })
  async logout(@Req() req: BaseRequest, @Res({ passthrough: false }) res: Response) {
    try {
      res.clearCookie('access_token', this.#cookieOptions);
      const passportLogout = (): Promise<void> =>
        new Promise((resolve, reject) => {
          req.logOut((err) => {
            if (err) {
              this.#logger.error('Error during Passport logout:', err);
              return reject(err);
            }
            this.#logger.log('Passport logout successful.');
            resolve();
          });
        });

      await passportLogout();

      const sessionDestroy = (): Promise<void> =>
        new Promise((resolve, reject) => {
          if (!req.session) {
            return resolve();
          }
          req.session.destroy((err) => {
            if (err) {
              this.#logger.error('Error destroying session:', err);
              return reject(err);
            }

            resolve();
          });
        });

      await sessionDestroy();

      res.status(HttpStatus.OK).send({ message: 'Logged out successfully' });
    } catch (error) {
      this.#logger.error('Logout process failed', error);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Logout failed.' });
      }
    }
  }
}
