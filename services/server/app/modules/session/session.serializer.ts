import { PassportSerializer } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../db/entities/users/user.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { UsersService } from '../../api/users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  private readonly logger = new ContextLogger(SessionSerializer.name);

  constructor(@Inject(UsersService) private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: User, done: (err: Error | null, userId?: string) => void): void {
    this.logger.debug(`Serializing user: ${user.email} (ID: ${user.id})`);
    done(null, user.id);
  }

  async deserializeUser(userId: string, done: (err: Error | null, user?: User | null) => void): Promise<void> {
    this.logger.debug(`Deserializing user ID: ${userId}`);
    try {
      const user = await this.usersService.findUserById(userId);
      if (!user) {
        this.logger.warn(`DeserializeUser: User with ID ${userId} not found.`);
        return done(null, null);
      }
      this.logger.debug(`Deserialized user: ${user.email}`);
      done(null, user);
    } catch (err) {
      const error = err as Error;
      this.logger.error(`DeserializeUser Error for ID ${userId}: ${error.message}`, error);
      done(error);
    }
  }
}
