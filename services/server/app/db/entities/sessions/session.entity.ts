import { Entity, PrimaryColumn, Column, Index, ValueTransformer } from 'typeorm';
import { SessionData } from 'express-session';

const jsonDataTransformer: ValueTransformer = {
  to: (value: SessionData): string => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('Failed to stringify session JSON:', error);
      return '{}';
    }
  },
  from: (value: string): SessionData => {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Failed to parse session JSON:', error);
      return {} as SessionData;
    }
  },
};

@Entity('sessions')
export class Session {
  @PrimaryColumn('varchar', { length: 255 })
  sid: string;

  @Column({ type: 'jsonb', transformer: jsonDataTransformer })
  sess: SessionData;

  @Index()
  @Column('timestamp with time zone')
  expire: Date;
}
