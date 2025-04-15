import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConsoleLogger, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from './const';
import { UnhandledRoutes } from './filters/unhandled-routes.filter';
import passport from 'passport';
import expressSession from 'express-session';
import { HttpLoggingInterceptor } from './interceptors/http-logging.interceptor.js';
import cookieParser from 'cookie-parser';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import { WebSocketGateway } from '@nestjs/websockets';
import { EventsGateway } from './modules/events/events.gateway.js';

// use cjs import as es6 import will copy the package json in the compilation folder which would confuse pnpm for monorepo mgmt
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { name, version, description, author, homepage } = require('../package.json');

async function bootstrap(module: typeof AppModule) {
  const logger = new ConsoleLogger({
    context: name,
    json: true,
  });

  const app = await NestFactory.create<INestApplication<Express.Application>>(module, {
    logger,
  });

  const configService = app.get(ConfigService<ValidatedConfig, true>);
  const appConfig = configService.get('app', { infer: true });
  const appEnv = configService.get('env', { infer: true });
  const corsConfig = configService.get('cors', { infer: true });

  const corsOrigin =
    (corsContext: string) =>
    (origin: string, cb: (err: Error | null, origin?: boolean | string | RegExp | (string | RegExp)[]) => void) => {
      if (!origin || corsConfig.allowedOrigins.indexOf(origin) !== -1) {
        cb(null, true);
      } else {
        logger.error(`${corsContext} CORS Error: Origin ${origin} not allowed.`);
        cb(new Error('Not allowed by CORS'));
      }
    };

  const corsBaseOpts: CorsOptions = {
    methods: corsConfig.methods,
    allowedHeaders: corsConfig.allowedHeaders,
    credentials: corsConfig.credentials,
  };

  app.enableCors({
    ...corsBaseOpts,
    origin: corsOrigin('HTTP'),
  });

  // Decorate the EventsGateway dynamically as we want to take values from config
  void WebSocketGateway({
    cors: {
      ...corsBaseOpts,
      origin: corsOrigin('WebSocketGateway'),
    },
    connectTimeout: 50000,
    pingInterval: 25000,
    pingTimeout: 5000,
  })(EventsGateway);

  const session = configService.get('auth.session', { infer: true });
  app.use(cookieParser());
  app.use(
    expressSession({
      secret: session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: session.cookie,
    }),
  );
  app.use(passport.initialize());

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
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
        body: { accessToken: string };
      }) {
        if (response.ok && response?.url?.includes('api/auth/login')) {
          (
            window as unknown as Window & { ui: { preauthorizeApiKey: (name: string, apiKey: string) => void } }
          ).ui.preauthorizeApiKey('bearerAuth', response.body.accessToken);
        }

        return response;
      },
    },
  });

  await app.listen(appConfig.port, '0.0.0.0');

  const appUrl = await app.getUrl();
  logger.log(`Application started at ${appUrl}`);
  logger.log(`API Docs at ${appUrl}/${appConfig.docs.apiPath}`);
}

void bootstrap(AppModule);
