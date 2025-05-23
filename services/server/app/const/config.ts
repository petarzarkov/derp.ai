import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength, validateSync } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
// use cjs import as es6 import will copy the package json in the compilation folder which we don't want
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkgJson = require('../../package.json');

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
  SESSION_PRUNE_INTERVAL: number = 60 * 120 * 1000;

  @IsString()
  GOOGLE_GEMINI_API_KEY: string;

  @IsString()
  GOOGLE_OAUTH_CLIENT_ID: string;

  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET: string;

  @IsString()
  LINKEDIN_OAUTH_CLIENT_ID: string;

  @IsString()
  LINKEDIN_OAUTH_CLIENT_SECRET: string;

  @IsString()
  GITHUB_OAUTH_CLIENT_ID: string;

  @IsString()
  GITHUB_OAUTH_CLIENT_SECRET: string;

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
  AI_REQ_TIMEOUT?: number = 100000;

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

  @IsOptional()
  @IsString()
  SLACK_BOT_DEFAULT_CHANNEL?: string;

  @IsString()
  GROQ_API_KEY: string;

  @IsString()
  OPENROUTER_API_KEY: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @Min(0)
  @Max(65535)
  REDIS_PORT: number;

  @IsString()
  REDIS_PASS: string;

  @IsString()
  appName: string = pkgJson.appName;

  @IsString()
  version: string = pkgJson.version;

  @IsString()
  supportEmail: string = pkgJson.author.email;
}

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvVars, config, { enableImplicitConversion: true });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const localHost = `http://localhost:${validatedConfig.SERVICE_PORT}`;
  const allowedOrigins = [localHost, `http://127.0.0.1:${validatedConfig.SERVICE_PORT}`];
  if (validatedConfig.HOST) {
    allowedOrigins.push(validatedConfig.HOST);
  }

  if (validatedConfig.ALLOWED_ORIGINS) {
    allowedOrigins.push(...validatedConfig.ALLOWED_ORIGINS.split(','));
  }

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
      'gemini-2.0-flash': {
        url: `https://generativelanguage.googleapis.com/v1beta/models`,
        provider: 'google',
        apiType: 'google.api.v1beta',
        apiKey: validatedConfig.GOOGLE_GEMINI_API_KEY,
      },
      'gemini-2.5-pro-exp-03-25': {
        url: `https://generativelanguage.googleapis.com/v1beta/models`,
        provider: 'google',
        apiType: 'google.api.v1beta',
        apiKey: validatedConfig.GOOGLE_GEMINI_API_KEY,
      },
      'llama-3.3-70b-versatile': {
        url: `https://api.groq.com/openai/v1/chat/completions`,
        provider: 'groq',
        apiType: 'groq.api.v1',
        apiKey: validatedConfig.GROQ_API_KEY,
      },
      'deepseek/deepseek-chat-v3-0324:free': {
        url: `https://openrouter.ai/api/v1/chat/completions`,
        provider: 'deepseek',
        apiType: 'openrouter.api.v1',
        apiKey: validatedConfig.OPENROUTER_API_KEY,
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
         * @default 60 * 15 * 1000
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
        callbackUrl:
          validatedConfig.APP_ENV === 'prod'
            ? `${validatedConfig.HOST}/api/auth/google/callback`
            : '/api/auth/google/callback',
      },
      linkedin: {
        clientId: validatedConfig.LINKEDIN_OAUTH_CLIENT_ID,
        clientSecret: validatedConfig.LINKEDIN_OAUTH_CLIENT_SECRET,
        callbackUrl:
          validatedConfig.APP_ENV === 'prod'
            ? `${validatedConfig.HOST}/api/auth/linkedin/callback`
            : '/api/auth/linkedin/callback',
      },
      github: {
        clientId: validatedConfig.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: validatedConfig.GITHUB_OAUTH_CLIENT_SECRET,
        callbackUrl:
          validatedConfig.APP_ENV === 'prod'
            ? `${validatedConfig.HOST}/api/auth/github/callback`
            : '/api/auth/github/callback',
      },
    },
    isDev: !validatedConfig.APP_ENV || validatedConfig.APP_ENV === 'dev',
    app: {
      env: validatedConfig.APP_ENV,
      name: validatedConfig.appName,
      region: process.env.REGION,
      version: validatedConfig.version,
      supportEmail: validatedConfig.supportEmail,
      serverUrl: validatedConfig.APP_ENV === 'dev' ? localHost : validatedConfig.HOST,
      port: validatedConfig.SERVICE_PORT,
      docsApiPath: validatedConfig.API_DOCS_PATH,
      /**
       * @default 100000
       */
      aiReqTimeout: validatedConfig.AI_REQ_TIMEOUT,
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
      defaultChannel: `${validatedConfig.SLACK_BOT_DEFAULT_CHANNEL}-${validatedConfig.APP_ENV}`,
      socketMode: validatedConfig.SLACK_APP_SOCKET_MODE,
    },
    gitInfo: {
      commit: {
        sha: process.env.GIT_COMMIT || process.env.COMMIT_SHA,
        message: process.env.GIT_COMMIT_MESSAGE || process.env.COMMIT_MESSAGE,
        author: process.env.GIT_COMMIT_AUTHOR || process.env.COMMIT_AUTHOR,
      },
      branch: process.env.GIT_BRANCH || process.env.BRANCH_NAME,
      repository: process.env.GIT_REPOSITORY || process.env.REPO_NAME,
      tag: process.env.GIT_TAG || process.env.TAG_NAME,
    },
    redis: {
      host: validatedConfig.REDIS_HOST,
      port: validatedConfig.REDIS_PORT,
      password: validatedConfig.REDIS_PASS,
      tls: validatedConfig.APP_ENV === 'prod',
      maxChatMessageHistory: 10,
    },
  } as const;
};

export type ValidatedConfig = ReturnType<typeof validateConfig>;
