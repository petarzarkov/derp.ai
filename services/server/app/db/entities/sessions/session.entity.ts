import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('sessions')
@Index(['userId'])
export class Session {
  @PrimaryColumn('varchar', { length: 255 })
  sid: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  browser: string | null;

  @Column('timestamp with time zone')
  @Index()
  expire: Date;

  @UpdateDateColumn()
  lastActivity: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL', // Or 'CASCADE' if sessions should be deleted when user is deleted
  })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}
