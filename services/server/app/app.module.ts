import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { Logger, MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { ValidatedConfig, validateConfig } from './const';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve, join } from 'node:path';
import { AuthModule } from './modules/auth/auth.module';
import { HttpLoggerModule } from './modules/http-logger/http-logger.module';
import { ServiceModule } from './api/service/service.module';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';
import { EventsModule } from './modules/events/events.module';
import { QnAModule } from './modules/qna/qna.module';
import { EventsGateway } from './modules/events/events.gateway';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve('../../', '.env'),
      validate: validateConfig,
      isGlobal: true,
    }),
    QnAModule,
    HttpLoggerModule,
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
    EventsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../web/dist'),
      exclude: ['/api/*'],
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  logger = new Logger(AppModule.name);

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

    await wsServer.server.close(this.logger.error.bind(this.logger));
  }
}
