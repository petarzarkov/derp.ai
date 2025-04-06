import { IsNumber, IsString, Max, Min, validateSync } from 'class-validator';
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
  GOOGLE_API_KEY: string;

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

  return {
    env: validatedConfig.APP_ENV,
    google: {
      apiKey: validatedConfig.GOOGLE_API_KEY,
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
  };
};

export type ValidatedConfig = ReturnType<typeof validateConfig>;
