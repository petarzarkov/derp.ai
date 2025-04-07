import { Module } from '@nestjs/common';
import { QnAService } from './qna.service';
import { AIModule } from '../ai/ai.model';

@Module({
  imports: [AIModule],
  providers: [QnAService],
  exports: [QnAService],
})
export class QnAModule {}
