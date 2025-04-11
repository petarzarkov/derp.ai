import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { QnAModule } from '../qna/qna.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  providers: [EventsGateway],
  imports: [QnAModule, AuthModule],
})
export class EventsModule {}
