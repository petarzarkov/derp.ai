import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { QnAModule } from '../qna/qna.module';

@Module({
  providers: [EventsGateway],
  imports: [QnAModule],
})
export class EventsModule {}
