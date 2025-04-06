import { Module } from '@nestjs/common';
import { QnAService } from './qna.service';

@Module({
  providers: [QnAService],
  exports: [QnAService],
})
export class QnAModule {}
