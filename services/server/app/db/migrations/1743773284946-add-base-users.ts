import { baseUsers } from '../../fixtures/baseUsers';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { User } from '../entities/users/user.entity';
import bcrypt from 'bcrypt';

const mappedUsers = baseUsers.map((user) => ({
  username: user,
  passwordHash: bcrypt.hashSync(user, 10),
}));

export class AddBaseUsers1743773284946 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersRepo = queryRunner.manager.getRepository(User);

    await usersRepo.insert(mappedUsers);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersRepo = queryRunner.manager.getRepository(User);

    for (const username of baseUsers) {
      await usersRepo.delete({ username });
    }
  }
}
