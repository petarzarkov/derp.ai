import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ValidatedConfig } from '../../../const/config';
import { AuthService } from '../auth.service';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new ContextLogger(GoogleStrategy.name);

  constructor(
    @Inject() readonly configService: ConfigService<ValidatedConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get('authProviders.google.clientId', { infer: true }),
      clientSecret: configService.get('authProviders.google.clientSecret', { infer: true }),
      callbackURL: configService.get('authProviders.google.callbackUrl', { infer: true }),
      scope: ['profile', 'email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string | undefined, profile: Profile, done: VerifyCallback) {
    const { id, displayName, emails, photos } = profile;
    if (!emails || emails.length === 0 || !emails[0].value) {
      this.logger.error('Google profile did not return an email.');
      return done(new UnauthorizedException('Email not provided by Google.'), false);
    }

    const email = emails[0].value;
    const picture = photos && photos.length > 0 ? photos[0].value : null;

    try {
      const user = await this.authService.findOrCreateUserFromOAuth(id, 'google', email, displayName, picture);

      ContextLogger.updateContext({ user, provider: 'google' });

      done(null, user);
    } catch (err) {
      this.logger.error('Error during Google OAuth validation', err as Error);
      done(err, false);
    }
  }
}
