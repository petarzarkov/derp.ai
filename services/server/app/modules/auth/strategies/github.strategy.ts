import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../../const/config';
import { AuthService } from '../auth.service';
import { ContextLogger } from 'nestjs-context-logger';
import { VerifyCallback } from 'passport-oauth2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new ContextLogger(GithubStrategy.name);

  constructor(
    readonly configService: ConfigService<ValidatedConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get('authProviders.github.clientId', { infer: true }),
      clientSecret: configService.get('authProviders.github.clientSecret', { infer: true }),
      callbackURL: configService.get('authProviders.github.callbackUrl', { infer: true }),
      scope: ['user:email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const { id, displayName, emails, photos } = profile;

    const email = emails?.[0]?.value;
    if (!email) {
      this.logger.error('GitHub profile did not return an email.');
      return done(new UnauthorizedException('Email not provided by GitHub'), false);
    }

    try {
      const user = await this.authService.findOrCreateUserFromOAuth(
        id,
        'github',
        email,
        displayName,
        photos?.[0]?.value || null,
      );

      ContextLogger.updateContext({ user, provider: 'github' });
      done(null, user);
    } catch (err) {
      this.logger.error('Error during GitHub OAuth validation', err as Error);
      done(err, false);
    }
  }
}
