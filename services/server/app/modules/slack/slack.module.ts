import { DynamicModule, Module } from '@nestjs/common';
import { SlackService } from './slack.service';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  exports: [SlackService],
  providers: [SlackService],
})
export class SlackModule {
  static forRoot(opts: { isGlobal: boolean } = { isGlobal: false }): DynamicModule {
    return {
      global: opts?.isGlobal,
      module: SlackModule,
      exports: [SlackService],
      providers: [SlackService],
    };
  }
}
