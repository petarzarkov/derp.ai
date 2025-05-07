import { ValidatedConfig } from '../../const';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedisService } from '../../modules/redis/redis.service';
import { DataSource } from 'typeorm';

@ApiTags('service')
@Controller({
  path: '/service',
})
export class ServiceController {
  constructor(
    private configService: ConfigService<ValidatedConfig, true>,
    private redisService: RedisService,
    private dataSource: DataSource,
  ) {}

  @Get('/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if service is healthy' })
  async healthCheck() {
    const [{ healthy }] = await this.dataSource.query('SELECT case when 1+1 = 2 then true else false end as healthy');
    const redisHealthy = await this.redisService.redisClient.ping();
    return {
      db: {
        healthy,
      },
      redis: {
        healthy: redisHealthy === 'PONG',
      },
    };
  }

  @Get('/config')
  @HttpCode(HttpStatus.OK)
  config() {
    const app = this.configService.get('app', { infer: true });
    const git = this.configService.get('gitInfo', { infer: true });
    const models = Object.keys(this.configService.get('aiProviders', { infer: true }));
    return {
      app,
      git,
      models,
    };
  }

  @Get('/up')
  @ApiOperation({ summary: 'Check if service is up' })
  upcheck() {
    return {};
  }
}
