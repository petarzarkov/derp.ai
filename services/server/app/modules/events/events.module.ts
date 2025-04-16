import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { QnAModule } from '../qna/qna.module';
import { SessionModule } from '../session/session.module';

@Module({
  providers: [EventsGateway],
  imports: [QnAModule, SessionModule],
})
export class EventsModule {}
