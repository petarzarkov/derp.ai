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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BaseRequest, LoginRequest, AuthResponse, RegisterRequest } from './auth.entity';
import { FastifyReply } from 'fastify';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleOAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';

@ApiTags('api', 'auth')
@Controller('/api/auth')
export class AuthController {
  constructor(
    private configService: ConfigService<ValidatedConfig, true>,
    private authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with email/password' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponse })
  @ApiResponse({ status: 400, description: 'Invalid registration data (validation errors)' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(@Body() registerDto: RegisterRequest): Promise<AuthResponse> {
    const user = await this.authService.registerLocalUser(registerDto);

    return this.authService.login(user);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login user and get JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @ApiBody({
    type: LoginRequest,
  })
  async login(@Req() req: BaseRequest): Promise<AuthResponse> {
    return this.authService.login(req.user);
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
    @Res({ passthrough: true }) res: FastifyReply,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('state') _state?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('No user data received from Google validation.');
    }

    // User is validated and attached by GoogleOAuthGuard/GoogleStrategy
    const loginResponse = await this.authService.login(req.user);
    const token = loginResponse.accessToken;

    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      await res
        .setCookie('access_token', token, {
          httpOnly: true,
          secure: 'auto',
          sameSite: 'lax',
          path: '/',
          expires: this.configService.get('auth.cookieExpiresIn', { infer: true }),
        })
        .redirect(redirectUrl);
    } catch (cookieError) {
      console.error('Failed to set cookie', cookieError);
      res.status(500).send({ message: 'Login successful, but failed to set cookie.' });
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  async logout(@Req() req: BaseRequest) {
    return req.body;
  }
}
