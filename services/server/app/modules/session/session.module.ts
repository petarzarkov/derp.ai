import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../../db/entities/sessions/session.entity';
import { SessionStore } from './session.store';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Session]), ConfigModule],
  providers: [SessionStore],
  exports: [SessionStore],
})
export class SessionModule {}
