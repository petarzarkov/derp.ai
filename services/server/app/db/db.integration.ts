import { Test, TestingModule } from '@nestjs/testing';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/users/user.entity';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestDBService {
  constructor(
    @InjectRepository(User)
    public userRepo: Repository<User>,
  ) {}
}

describe('DB Integration Test Suite', () => {
  let module: TestingModule;
  let testService: TestDBService;
  let postgres: StartedPostgreSqlContainer;

  beforeEach(async () => {
    // Start PostgreSQL container
    postgres = await new PostgreSqlContainer('public.ecr.aws/docker/library/postgres:17')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Create test module
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgres.getHost(),
          port: postgres.getPort(),
          database: postgres.getDatabase(),
          username: postgres.getUsername(),
          password: postgres.getPassword(),
          entities: ['./entities/**/*.entity{.ts,.js}'],
          autoLoadEntities: true,
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [TestDBService],
    }).compile();

    testService = module.get(TestDBService);
  }, 30_000);

  afterEach(async () => {
    await module.close();
    await postgres.stop();
  }, 30_000);

  it('should save user in the database', async () => {
    const user = await testService.userRepo.save({
      username: 'test_user',
      passwordHash: 'hashed_password',
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe('test_user');
    expect(user.passwordHash).toBe('hashed_password');
  });
});
