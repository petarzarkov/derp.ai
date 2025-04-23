import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../../const/config';
import { AuthService } from '../auth.service';
import { ContextLogger } from 'nestjs-context-logger';
import { LinkedInLocalStrategy, LinkedInOidcProfile } from './linkedin/linkedin.local.strategy';
import { VerifyCallback } from 'passport-oauth2';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(LinkedInLocalStrategy, 'linkedin') {
  private readonly logger = new ContextLogger(LinkedInStrategy.name);

  constructor(
    readonly configService: ConfigService<ValidatedConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get('authProviders.linkedin.clientId', { infer: true }),
      clientSecret: configService.get('authProviders.linkedin.clientSecret', { infer: true }),
      callbackURL: configService.get('authProviders.linkedin.callbackUrl', { infer: true }),
      scope: ['openid', 'email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: LinkedInOidcProfile, done: VerifyCallback) {
    const { sub: id, name, email, picture } = profile;

    if (!email) {
      this.logger.error('LinkedIn profile did not return an email.');
      return done(new UnauthorizedException('Email not provided by LinkedIn'), false);
    }

    try {
      const user = await this.authService.createOrUpdateUserOAuth(id, 'linkedin', email, name, picture || null);

      ContextLogger.updateContext({ user, provider: 'linkedin' });
      done(null, user);
    } catch (err) {
      this.logger.error('Error during LinkedIn OAuth validation', err as Error);
      done(err, false);
    }
  }
}
