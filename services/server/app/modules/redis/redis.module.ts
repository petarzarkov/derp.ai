import { Module, Global, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContextLogger } from 'nestjs-context-logger';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule implements OnModuleDestroy, OnModuleInit {
  #logger = new ContextLogger(RedisModule.name);
  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    try {
      await this.redisService.redisClient.connect();
    } catch (err) {
      this.#logger.error('Failed to connect Redis client during factory setup.', { err });
      throw err;
    }
  }
  async onModuleDestroy() {
    this.#logger.log('Disconnecting Redis client on module destroy...');
    try {
      if (this.redisService.redisClient.isOpen) {
        await this.redisService.redisClient.quit();
        this.#logger.log('Redis client disconnected successfully.');
      } else {
        this.#logger.log('Redis client already disconnected or quit.');
      }
    } catch (err) {
      this.#logger.error('Error disconnecting Redis client:', { err });
    }
  }
}
