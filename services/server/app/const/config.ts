import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class EnvVars {
  @IsString()
  APP_ENV: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  SERVICE_PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @MinLength(18)
  SESSION_SECRET: string;

  @IsString()
  GOOGLE_GEMINI_API_KEY: string;

  @IsString()
  GOOGLE_OAUTH_CLIENT_ID: string;

  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  HUGGINGFACE_API_KEY?: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASS: string;

  @IsBoolean()
  @IsOptional()
  DB_SSL?: boolean;

  @IsNumber()
  @IsOptional()
  AI_REQ_TIMEOUT?: number;
}

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvVars, config, { enableImplicitConversion: true });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const geminiModel = 'gemini-2.0-flash';
  return {
    env: validatedConfig.APP_ENV,
    aiProviders: {
      google: {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}`,
        model: geminiModel,
        apiKey: validatedConfig.GOOGLE_GEMINI_API_KEY,
      },
    },
    auth: {
      jwt: {
        secret: validatedConfig.JWT_SECRET,
        expiresIn: '24h',
      },
      session: {
        secret: validatedConfig.SESSION_SECRET,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 7,
          httpOnly: true,
          secure: validatedConfig.APP_ENV === 'prod',
          sameSite: 'lax',
          path: '/',
        },
      },
    },
    authProviders: {
      google: {
        clientId: validatedConfig.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: validatedConfig.GOOGLE_OAUTH_CLIENT_SECRET,
        callbackUrl: '/api/auth/google/callback',
      },
    },
    isDev: !validatedConfig.APP_ENV || validatedConfig.APP_ENV === 'dev',
    app: {
      port: validatedConfig.SERVICE_PORT,
      docs: {
        apiPath: process.env.API_DOCS_PATH || 'api',
      },
      aiReqTimeout: validatedConfig.AI_REQ_TIMEOUT || 25000,
    },
    db: {
      name: validatedConfig.DB_NAME,
      host: validatedConfig.DB_HOST,
      port: validatedConfig.DB_PORT,
      username: validatedConfig.DB_USER,
      password: validatedConfig.DB_PASS,
      ssl: validatedConfig.DB_SSL,
    },
  } as const;
};

export type ValidatedConfig = ReturnType<typeof validateConfig>;
