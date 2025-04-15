import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ExecutionContext, MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { REQUEST_ID_HEADER_KEY, ValidatedConfig, validateConfig } from './const';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceModule } from './api/service/service.module';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';
import { EventsModule } from './modules/events/events.module';
import { QnAModule } from './modules/qna/qna.module';
import { EventsGateway } from './modules/events/events.gateway';
import { ModuleRef } from '@nestjs/core';
import { UsersModule } from './api/users/users.module';
import { ContextLogger, ContextLoggerModule } from 'nestjs-context-logger';
import { v4 as uuidv4 } from 'uuid';
import { BaseRequest } from './modules/auth/auth.entity';
import pino from 'pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(__dirname, '../../../', '.env'), resolve(__dirname, '../../../', '.env.dev')],
      validate: validateConfig,
      isGlobal: true,
    }),
    ContextLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ValidatedConfig, true>) => ({
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
                  'user-agent': req.headers['user-agent'],
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
            paths: ['request.body.password'],
            censor: '***',
          },
        },
        enrichContext: async (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<BaseRequest>();

          return {
            userId: req.user?.id,
            email: req.user?.email,
            requestId: req.headers[REQUEST_ID_HEADER_KEY],
            env: configService.get('env', { infer: true }),
          };
        },
        contextAdapter(context) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { correlationId, requestMethod: method, requestUrl: path, ...rest } = context;
          return {
            method,
            path,
            ...rest,
          };
        },
      }),
    }),
    QnAModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ValidatedConfig, true>) => {
        const dbConfig = configService.get('db', { infer: true });
        const isDev = configService.get('isDev', { infer: true });
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
          logging: isDev,
        };
      },
      inject: [ConfigService],
    }),
    ServiceModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ServeStaticModule.forRoot({
      renderPath: '/',
      rootPath: resolve(__dirname, '../../web/dist'),
      exclude: ['/api/*'],
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  logger = new ContextLogger(AppModule.name);

  constructor(
    public readonly configService: ConfigService<ValidatedConfig, true>,
    private readonly moduleRef: ModuleRef,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.debug(`Graceful shutdown signal: ${signal}`);
    const wsServer = this.moduleRef.get(EventsGateway, { strict: false });

    await wsServer.server.close((err) => {
      if (err) {
        this.logger.error('Error closing WebSocket server:', err);
      } else {
        this.logger.log('WebSocket server closed.');
      }
    });
  }
}
