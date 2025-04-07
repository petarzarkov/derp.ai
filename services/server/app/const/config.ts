import { IsNumber, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';
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
  GOOGLE_GEMINI_API_KEY: string;

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
  DB_PORT: number;
  @IsString()
  DB_USER: string;
  @IsString()
  DB_PASS: string;
}

export const validateConfig = (config: Record<string, unknown>) => {
  const validatedConfig = plainToInstance(EnvVars, config, { enableImplicitConversion: true });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const geminiModel = 'gemini-1.5-flash-latest';
  return {
    env: validatedConfig.APP_ENV,
    aiProviders: {
      google: {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}`,
        model: geminiModel,
        apiKey: validatedConfig.GOOGLE_GEMINI_API_KEY,
      },
      // ...(validatedConfig.HUGGINGFACE_API_KEY && {
      //   'google/flan-t5-base': {
      //     url: 'https://api-inference.huggingface.co/models/google/flan-t5-base',
      //     model: 'google/flan-t5-base',
      //     apiKey: validatedConfig.HUGGINGFACE_API_KEY,
      //   },
      //   'facebook/bart-large-cnn': {
      //     url: 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      //     model: 'facebook/bart-large-cnn',
      //     apiKey: validatedConfig.HUGGINGFACE_API_KEY,
      //   },
      // }),
    },
    auth: {
      secret: validatedConfig.JWT_SECRET,
      expiresIn: '24h',
    },
    isDev: !validatedConfig.APP_ENV || validatedConfig.APP_ENV === 'dev',
    app: {
      port: validatedConfig.SERVICE_PORT,
      docs: {
        apiPath: process.env.API_DOCS_PATH || 'api',
      },
    },
    db: {
      name: validatedConfig.DB_NAME,
      host: validatedConfig.DB_HOST,
      port: validatedConfig.DB_PORT,
      username: validatedConfig.DB_USER,
      password: validatedConfig.DB_PASS,
    },
  } as const;
};

export type ValidatedConfig = ReturnType<typeof validateConfig>;
