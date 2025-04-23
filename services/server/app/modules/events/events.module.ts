import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SessionModule } from '../session/session.module';
import { AIModule } from '../ai/ai.module';

@Module({
  providers: [EventsGateway],
  imports: [AIModule, SessionModule],
})
export class EventsModule {}
