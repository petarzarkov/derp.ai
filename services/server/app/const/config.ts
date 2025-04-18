import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';

const envs = ['dev', 'prod'] as const;
export type AppEnv = (typeof envs)[number];
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export class EnvVars {
  @IsIn(envs)
  APP_ENV: AppEnv;

  @IsString()
  @IsOptional()
  LOG_LEVEL: LogLevel = 'info';

  @IsString()
  @IsOptional()
  API_DOCS_PATH = 'api';

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  @IsString()
  HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  SERVICE_PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @MinLength(18)
  SESSION_SECRET: string;

  @IsNumber()
  @IsOptional()
  SESSION_PRUNE_INTERVAL: number = 60 * 15 * 1000;

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

  @Transform(({ value }) => value === true)
  @IsBoolean()
  @IsOptional()
  DB_SSL?: boolean;

  @IsNumber()
  @IsOptional()
  AI_REQ_TIMEOUT?: number;

  @IsString()
  SLACK_APP_TOKEN: string;

  @Transform(({ value }) => value === true)
  @IsBoolean()
  @IsOptional()
  SLACK_APP_SOCKET_MODE = true;

  @IsString()
  @IsOptional()
  SLACK_USER_TOKEN?: string;

  @IsString()
  SLACK_SIGNING_SECRET: string;

  @IsString()
  SLACK_BOT_TOKEN: string;

  @IsString()
  SLACK_BOT_NAME: string;

  @IsOptional()
  @IsString()
  SLACK_BOT_DEFAULT_CHANNEL?: string;
}

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvVars, config, { enableImplicitConversion: true });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const geminiModel = 'gemini-2.0-flash';
  const localHost = `http://localhost:${validatedConfig.SERVICE_PORT}`;
  const allowedOrigins = [localHost, `http://127.0.0.1:${validatedConfig.SERVICE_PORT}`];
  if (validatedConfig.HOST) {
    allowedOrigins.push(validatedConfig.HOST);
  }

  if (validatedConfig.ALLOWED_ORIGINS) {
    allowedOrigins.push(...validatedConfig.ALLOWED_ORIGINS.split(','));
  }

  console.log(validatedConfig.DB_SSL);
  return {
    env: validatedConfig.APP_ENV,
    log: {
      level: validatedConfig.LOG_LEVEL,
    },
    cors: {
      allowedOrigins: allowedOrigins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    },
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
        /**
         * if `0` the interval won't run
         * @default 60 * 15
         */
        pruneInterval: validatedConfig.SESSION_PRUNE_INTERVAL,
        cookieName: 'connect.sid',
        cookie: {
          /**
           * 1 day in ms
           * @default 1000 * 60 * 60 * 24 * 1
           */
          maxAge: 1000 * 60 * 60 * 24 * 1,
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
        callbackUrl: `${
          validatedConfig.APP_ENV === 'prod' ? validatedConfig.HOST : localHost
        }/api/auth/google/callback`,
      },
    },
    isDev: !validatedConfig.APP_ENV || validatedConfig.APP_ENV === 'dev',
    app: {
      host: validatedConfig.HOST,
      port: validatedConfig.SERVICE_PORT,
      docs: {
        apiPath: validatedConfig.API_DOCS_PATH,
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
    slack: {
      appToken: validatedConfig.SLACK_APP_TOKEN,
      botToken: validatedConfig.SLACK_BOT_TOKEN,
      userToken: validatedConfig.SLACK_USER_TOKEN,
      signingSecret: validatedConfig.SLACK_SIGNING_SECRET,
      botName: validatedConfig.SLACK_BOT_NAME,
      defaultChannel: validatedConfig.SLACK_BOT_DEFAULT_CHANNEL,
      socketMode: validatedConfig.SLACK_APP_SOCKET_MODE,
    },
  } as const;
};

export type ValidatedConfig = ReturnType<typeof validateConfig>;
