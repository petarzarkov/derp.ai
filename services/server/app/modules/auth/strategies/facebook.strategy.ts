import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../../const/config';
import { AuthService } from '../auth.service';
import { ContextLogger } from 'nestjs-context-logger';
import { VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new ContextLogger(FacebookStrategy.name);

  constructor(
    readonly configService: ConfigService<ValidatedConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get('authProviders.facebook.clientId', { infer: true }),
      clientSecret: configService.get('authProviders.facebook.clientSecret', { infer: true }),
      callbackURL: configService.get('authProviders.facebook.callbackUrl', { infer: true }),
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const { id, displayName, emails, photos } = profile;

    if (!emails || !emails.length) {
      this.logger.error('Facebook profile did not return an email.');
      return done(new UnauthorizedException('Email not provided by Facebook'), false);
    }

    try {
      const user = await this.authService.findOrCreateUserFromOAuth(
        id,
        'facebook',
        emails[0].value,
        displayName,
        photos?.[0]?.value || null,
      );

      ContextLogger.updateContext({ user, provider: 'facebook' });
      done(null, user);
    } catch (err) {
      this.logger.error('Error during Facebook OAuth validation', err as Error);
      done(err, false);
    }
  }
}
