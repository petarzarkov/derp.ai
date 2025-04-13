import { resolve } from 'node:path';
// optionally import dotenv, as in prod it would not be installed, TODO: migrate to es6 modules, huge refactor
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv');

  config({
    path: [resolve(__dirname, '../../../', '.env'), resolve(__dirname, '../../../', '.env.dev')],
  });
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error importing dotenv', { error: error as Error });
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { v4 } from 'uuid';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST_ID_HEADER_KEY, ValidatedConfig } from './const';
import { UnhandledRoutes } from './filters/unhandled-routes.filter';
import fastifyCookie from '@fastify/cookie';

// use cjs import as es6 import will copy the package json in the compilation folder which would confuse pnpm for monorepo mgmt
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { name, version, description, author, homepage } = require('../package.json');

async function bootstrap(module: typeof AppModule) {
  const logger = new ConsoleLogger({
    context: name,
    json: true,
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    module,
    new FastifyAdapter({
      requestIdHeader: REQUEST_ID_HEADER_KEY,
      genReqId: () => v4(),
      // handle longer query params
      maxParamLength: 1000,
    }),
    {
      logger,
    },
  );

  const configService = app.get(ConfigService<ValidatedConfig, true>);
  const appConfig = configService.get('app', { infer: true });
  const appEnv = configService.get('env', { infer: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new UnhandledRoutes());

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle(name)
    .setVersion(version)
    .setDescription(description)
    .setContact(author.name, homepage, author.email)
    .addBearerAuth(
      {
        type: 'http',
        in: 'header',
        bearerFormat: 'JWT',
        scheme: 'bearer',
        name: 'Authorization',
        description: 'Enter your access token',
      },
      'bearerAuth',
    )
    .addSecurityRequirements('bearerAuth');

  const document = SwaggerModule.createDocument(app, config.build());

  SwaggerModule.setup(appConfig.docs.apiPath, app, document, {
    customSiteTitle: `NestJS Derp AI API ${appEnv}`,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      // Authorize the swagger UI on logging in successfully
      responseInterceptor: function setBearerOnLogin(response: {
        ok: boolean;
        url: string | string[];
        body: { access_token: string };
      }) {
        if (response.ok && response?.url?.includes('auth/login')) {
          (
            window as unknown as Window & { ui: { preauthorizeApiKey: (name: string, apiKey: string) => void } }
          ).ui.preauthorizeApiKey('bearerAuth', response.body.access_token);
        }

        return response;
      },
    },
  });

  app.enableCors();

  const cookieSecret = configService.get('auth.cookieSecret', { infer: true });
  await app.register(fastifyCookie, {
    secret: cookieSecret,
  });

  await app.listen(appConfig.port, '0.0.0.0');

  const appUrl = await app.getUrl();
  logger.log(`Application started at ${appUrl}`);
  logger.log(`API Docs at ${appUrl}/${appConfig.docs.apiPath}`);
}

void bootstrap(AppModule);
