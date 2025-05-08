import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ExecutionContext, MiddlewareConsumer, Module, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { REQUEST_ID_HEADER_KEY, ValidatedConfig, validateConfig } from './const';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceModule } from './api/service/service.module';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';
import { EventsModule } from './modules/events/events.module';
import { UsersModule } from './api/users/users.module';
import { ContextLogger, ContextLoggerModule } from 'nestjs-context-logger';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { SessionModule } from './modules/session/session.module';
import { SlackModule } from './modules/slack/slack.module';
import { SlackService } from './modules/slack/slack.service';
import { DeviceInfoMiddleware } from './middlewares/device-info.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Request } from 'express';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { RedisModule } from './modules/redis/redis.module';
import { hostname } from 'os';

const host = hostname();

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(__dirname, '../../../', '.env'), resolve(__dirname, '../../../', '.env.dev')],
      validate: validateConfig,
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 5,
        skipIf: (context: ExecutionContext) => !!context.switchToHttp().getRequest<Request>().user,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
        skipIf: (context: ExecutionContext) => !!context.switchToHttp().getRequest<Request>().user,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 300,
        skipIf: (context: ExecutionContext) => !!context.switchToHttp().getRequest<Request>().user,
      },
    ]),
    SlackModule.forRoot({ isGlobal: true }),
    ContextLoggerModule.forRootAsync({
      imports: [ConfigModule, SlackModule],
      inject: [ConfigService, SlackService],
      useFactory: (configService: ConfigService<ValidatedConfig, true>, slackService: SlackService) => ({
        pinoHttp: {
          base: null,
          level: configService.get('log.level', { infer: true }),
          genReqId: (req) => {
            if (req.headers[REQUEST_ID_HEADER_KEY]) {
              return req.headers[REQUEST_ID_HEADER_KEY];
            }

            req.headers[REQUEST_ID_HEADER_KEY] = uuidv4();
            return req.headers[REQUEST_ID_HEADER_KEY];
          },
          messageKey: 'message',
          timestamp: pino.stdTimeFunctions.isoTime,
          formatters: {
            level: (label) => ({ level: label }),
          },
          customAttributeKeys: {
            req: 'request',
            res: 'response',
            err: 'error',
          },
          serializers: {
            req: (req) => {
              return {
                headers: {
                  referer: req.headers.referer,
                  host: req.headers.host,
                  origin: req.headers.origin,
                },
                body: req.raw.body,
                remoteAddress: req.remoteAddress,
                remotePort: req.remotePort,
              };
            },
            res: (res) => ({
              statusCode: res.statusCode,
            }),
            err: pino.stdSerializers.err,
          },
          redact: {
            paths: ['request.body.password', 'payload.latestChatMessages'],
            censor: '***',
          },
        },
        enrichContext: async (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<Request>();

          return {
            user: req.user,
            sessionID: req.sessionID,
            requestId: req.headers[REQUEST_ID_HEADER_KEY],
            env: configService.get('env', { infer: true }),
          };
        },
        contextAdapter(context) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { correlationId, requestMethod: method, requestUrl: path, ...rest } = context;
          const { env, version, region } = configService.get('app', { infer: true });
          return {
            env,
            region,
            pid: process.pid,
            host,
            version,
            method,
            path,
            ...rest,
          };
        },
        hooks: {
          log: [
            function (message, bindings) {
              slackService.queueLog('good', message, bindings);
            },
          ],
          warn: [
            function (message, bindings) {
              slackService.queueLog('warning', message, bindings);
            },
          ],
          error: [
            function (message, bindings) {
              slackService.queueLog('danger', message, bindings);
            },
          ],
          fatal: [
            function (message, bindings) {
              slackService.queueLog('fatal', message, bindings);
            },
          ],
        },
      }),
    }),
    RedisModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ValidatedConfig, true>) => {
        const dbConfig = configService.get('db', { infer: true });
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          ssl: dbConfig.ssl,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          entities: [resolve(__dirname, './db/entities/**/*.entity{.ts,.js}')],
          migrations: [resolve(__dirname, './db/migrations/**/*{.ts,.js}')],
          migrationsRun: true,
          autoLoadEntities: true,
          logging: ['warn', 'error'],
          retryAttempts: undefined,
        };
      },
      inject: [ConfigService],
    }),
    SessionModule,
    ServiceModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ServeStaticModule.forRoot(
      {
        renderPath: '/',
        rootPath: resolve(__dirname, '../../web/dist'),
        exclude: ['/api/*'],
        serveStaticOptions: {
          fallthrough: true,
        },
      },
      {
        renderPath: '/',
        serveRoot: '/privacy-policy',
        rootPath: resolve(__dirname, '../../web/dist'),
        exclude: ['/api/*'],
        serveStaticOptions: {
          fallthrough: true,
        },
      },
      {
        renderPath: '/',
        serveRoot: '/terms-of-service',
        rootPath: resolve(__dirname, '../../web/dist'),
        exclude: ['/api/*'],
        serveStaticOptions: {
          fallthrough: true,
        },
      },
    ),
    // Just to prevent client from accessing the same resource quickly in succession
    CacheModule.register({
      ttl: 5000,
    }),
  ],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  logger = new ContextLogger(AppModule.name);

  constructor(
    public readonly configService: ConfigService<ValidatedConfig, true>,
    public readonly slackService: SlackService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(DeviceInfoMiddleware).forRoutes('*');
  }

  async onApplicationBootstrap() {
    const appConfig = this.configService.get('app', { infer: true });
    const corsConfig = this.configService.get('cors', { infer: true });
    const gitInfo = this.configService.get('gitInfo', { infer: true });
    const env = this.configService.get('env', { infer: true });

    await this.slackService.postContext({
      username: `${appConfig.name} - ${env}`,
      header: `:zap: ${appConfig.name} ${env} ${appConfig.version} started - ${new Date().toISOString()}`,
      data: {
        appConfig,
        corsConfig,
        gitInfo,
      },
      color: '#4432a8',
      buttons: {
        items: [
          {
            text: 'Open my UI',
            url: appConfig.serverUrl,
            style: 'primary',
          },
          {
            text: 'See my app logs here',
            url: 'https://app.koyeb.com/services/8dfcf0aa-6c18-4b20-8f4f-85ef6129d043?deploymentId=5e9fb48b-930e-4a74-8c45-e3195b8cfbaa',
          },
        ],
      },
    });
  }
}
