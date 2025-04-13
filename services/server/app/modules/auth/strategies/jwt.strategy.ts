import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../../const'; // Adjust path if needed
import { JWTPayload } from '../auth.entity';
import { AuthService } from '../auth.service'; // Inject AuthService

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<ValidatedConfig, true>,
    private authService: AuthService, // Inject AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.secret', { infer: true }),
    });
  }

  /**
   * Called by Passport after successfully verifying the JWT signature.
   * Fetches the user associated with the token's payload.
   * The return value is attached to req.user.
   */
  async validate(payload: JWTPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found for token');
    }

    return user;
  }
}
