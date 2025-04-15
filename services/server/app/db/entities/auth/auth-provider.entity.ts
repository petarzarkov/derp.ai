import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Relation,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('auth_providers')
@Index(['provider', 'providerId'], { unique: true, where: '"providerId" IS NOT NULL' })
@Index(['userId', 'provider'], { unique: true })
export class AuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'text', nullable: true })
  providerId: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  passwordHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.authProviders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;
}
