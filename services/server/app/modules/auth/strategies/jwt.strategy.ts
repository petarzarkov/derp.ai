import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../../const';
import { JWTPayload } from '../auth.entity';
import { AuthService } from '../auth.service';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly configService: ConfigService<ValidatedConfig, true>,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth.jwt.secret', { infer: true }),
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

    ContextLogger.updateContext({ user });
    return user;
  }
}
