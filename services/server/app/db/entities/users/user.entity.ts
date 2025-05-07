import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  Relation,
} from 'typeorm';
import { AuthProvider } from '../auth/auth-provider.entity';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ChatHistoryItem } from '@derpai/common';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  picture: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AuthProvider, (authProvider) => authProvider.user)
  authProviders: Relation<AuthProvider>[];
}

export class SanitizedUser extends OmitType(User, ['authProviders']) {}

export class UsersMeResponse extends SanitizedUser {
  @ApiProperty({ type: [ChatHistoryItem] })
  latestChatMessages: ChatHistoryItem[];
}
