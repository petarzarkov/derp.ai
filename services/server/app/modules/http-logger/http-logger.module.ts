import { Module } from '@nestjs/common';
import { HttpLoggerService } from './http-logger.service';

@Module({
  providers: [HttpLoggerService],
})
export class HttpLoggerModule {}
