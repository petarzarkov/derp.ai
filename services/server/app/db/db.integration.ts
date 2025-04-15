import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/users/user.entity';
import { AuthProvider } from './entities/auth/auth-provider.entity';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Repository, QueryFailedError } from 'typeorm';
// import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// @Injectable()
// export class TestDBService {
//   constructor(
//     @InjectRepository(User)
//     public userRepo: Repository<User>,
//     @InjectRepository(AuthProvider) // Inject AuthProvider repo
//     public authProviderRepo: Repository<AuthProvider>,
//   ) {}
// }

describe('DB Integration Test Suite', () => {
  let module: TestingModule;
  // let testService: TestDBService;
  let postgres: StartedPostgreSqlContainer;
  let userRepository: Repository<User>;
  let authProviderRepository: Repository<AuthProvider>;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgres.getHost(),
          port: postgres.getPort(),
          database: postgres.getDatabase(),
          username: postgres.getUsername(),
          password: postgres.getPassword(),
          entities: [User, AuthProvider],
          synchronize: true,
          // logging: ['query', 'error'], // Enable logging for debugging if needed
        }),
        TypeOrmModule.forFeature([User, AuthProvider]),
      ],
      // providers: [TestDBService],
    }).compile();

    // testService = module.get(TestDBService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    authProviderRepository = module.get<Repository<AuthProvider>>(getRepositoryToken(AuthProvider));
  }, 60_000); // Increase timeout for container startup

  afterAll(async () => {
    await module?.close();
    await postgres?.stop();
  }, 30_000);

  // Clean tables before each test to ensure isolation
  beforeEach(async () => {
    // Order matters due to foreign key constraints (delete AuthProvider before User)
    await authProviderRepository.query('DELETE FROM "auth_providers";');
    await userRepository.query('DELETE FROM "users";');
  });

  it('should save a basic User in the database', async () => {
    const email = 'test.user@domain.com';
    const displayName = 'Test User Basic';
    const user = userRepository.create({ email, displayName });
    const savedUser = await userRepository.save(user);

    expect(savedUser).toBeDefined();
    expect(savedUser.id).toBeDefined();
    expect(savedUser.email).toBe(email);
    expect(savedUser.displayName).toBe(displayName);
    expect(savedUser.picture).toBeNull();
    expect(savedUser.createdAt).toBeInstanceOf(Date);
    expect(savedUser.updatedAt).toBeInstanceOf(Date);

    // Verify retrieval
    const foundUser = await userRepository.findOneBy({ id: savedUser.id });
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(email);
  });

  it('should save a User with a linked local AuthProvider', async () => {
    const email = 'local.user@domain.com';
    const displayName = 'Local Auth User';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create User
    const user = userRepository.create({ email, displayName });
    const savedUser = await userRepository.save(user);

    // 2. Create Local AuthProvider linked to the User
    const authProvider = authProviderRepository.create({
      // userId: savedUser.id, // Can link via userId
      user: savedUser, // Or link via the entity object
      provider: 'local',
      providerId: null,
      passwordHash: hashedPassword,
    });
    const savedProvider = await authProviderRepository.save(authProvider);

    expect(savedProvider).toBeDefined();
    expect(savedProvider.id).toBeDefined();
    expect(savedProvider.userId).toBe(savedUser.id);
    expect(savedProvider.provider).toBe('local');
    expect(savedProvider.passwordHash).toBe(hashedPassword);
    expect(savedProvider.providerId).toBeNull();

    // Verify retrieval with relation
    const foundProvider = await authProviderRepository.findOne({
      where: { id: savedProvider.id },
      relations: { user: true },
    });
    expect(foundProvider).toBeDefined();
    expect(foundProvider?.user).toBeDefined();
    expect(foundProvider?.user.id).toBe(savedUser.id);
    expect(foundProvider?.user.email).toBe(email);

    // Verify passwordHash is not selected by default
    const foundProviderDefault = await authProviderRepository.findOneBy({ id: savedProvider.id });
    expect(foundProviderDefault).toBeDefined();
    expect(foundProviderDefault!.passwordHash).not.toBeDefined();

    // Verify user retrieval includes the provider relation
    const foundUserWithProviders = await userRepository.findOne({
      where: { id: savedUser.id },
      relations: { authProviders: true },
    });
    expect(foundUserWithProviders).toBeDefined();
    expect(foundUserWithProviders?.authProviders).toBeDefined();
    expect(foundUserWithProviders?.authProviders).toHaveLength(1);
    expect(foundUserWithProviders?.authProviders[0].id).toBe(savedProvider.id);
    expect(foundUserWithProviders?.authProviders[0].provider).toBe('local');
  });

  it('should save a User with a linked OAuth AuthProvider', async () => {
    const email = 'oauth.user@domain.com';
    const displayName = 'OAuth User';
    const googleId = 'google-oauth-id-12345';

    // 1. Create User
    const user = userRepository.create({ email, displayName });
    const savedUser = await userRepository.save(user);

    // 2. Create Google AuthProvider linked to the User
    const authProvider = authProviderRepository.create({
      user: savedUser,
      provider: 'google',
      providerId: googleId, // Set the external ID
      passwordHash: null, // No password hash for OAuth
    });
    const savedProvider = await authProviderRepository.save(authProvider);

    expect(savedProvider).toBeDefined();
    expect(savedProvider.userId).toBe(savedUser.id);
    expect(savedProvider.provider).toBe('google');
    expect(savedProvider.providerId).toBe(googleId);
    expect(savedProvider.passwordHash).toBeNull();

    // Verify retrieval
    const foundProvider = await authProviderRepository.findOne({
      where: { provider: 'google', providerId: googleId },
      relations: { user: true },
    });
    expect(foundProvider).toBeDefined();
    expect(foundProvider?.user?.email).toBe(email);
  });

  it('should enforce unique constraint on (userId, provider)', async () => {
    const user = await userRepository.save({ email: 'constraint.user@domain.com' });
    await authProviderRepository.save({ user: user, provider: 'local', passwordHash: 'hash1' });

    // Try saving another 'local' provider for the SAME user
    const duplicateProvider = authProviderRepository.create({ user: user, provider: 'local', passwordHash: 'hash2' });

    await expect(authProviderRepository.save(duplicateProvider)).rejects.toThrow(QueryFailedError); // Expect a TypeORM error

    await expect(authProviderRepository.save(duplicateProvider)).rejects.toThrow(
      /duplicate key value violates unique constraint "IDX_.*"/,
    ); // Check error message if possible
    // The exact constraint name (IDX_...) might vary based on auto-generation

    // Verify only one provider exists
    const providers = await authProviderRepository.find({ where: { userId: user.id } });
    expect(providers).toHaveLength(1);
  });

  it('should enforce unique constraint on (provider, providerId)', async () => {
    const user1 = await userRepository.save({ email: 'constraint.user1@domain.com' });
    const user2 = await userRepository.save({ email: 'constraint.user2@domain.com' });
    const googleId = 'unique-google-id-789';

    await authProviderRepository.save({ user: user1, provider: 'google', providerId: googleId });

    // Try saving another 'google' provider with the SAME providerId for a DIFFERENT user
    const duplicateProvider = authProviderRepository.create({ user: user2, provider: 'google', providerId: googleId });

    await expect(authProviderRepository.save(duplicateProvider)).rejects.toThrow(QueryFailedError);

    await expect(authProviderRepository.save(duplicateProvider)).rejects.toThrow(
      /duplicate key value violates unique constraint "IDX_.*"/,
    );

    // Verify only one provider with this googleId exists
    const providers = await authProviderRepository.find({ where: { provider: 'google', providerId: googleId } });
    expect(providers).toHaveLength(1);
    expect(providers[0].userId).toBe(user1.id);
  });

  it('should allow multiple providers for the same user if providers are different', async () => {
    const user = await userRepository.save({ email: 'multi.provider@domain.com' });
    await authProviderRepository.save({ user: user, provider: 'local', passwordHash: 'hash' });
    await authProviderRepository.save({ user: user, provider: 'google', providerId: 'multi-google-id' });

    const providers = await authProviderRepository.find({ where: { userId: user.id } });
    expect(providers).toHaveLength(2);
    const providerNames = providers.map((p) => p.provider).sort();
    expect(providerNames).toEqual(['google', 'local']);
  });

  it('should cascade delete AuthProviders when User is deleted', async () => {
    // Arrange: Create user with local and google providers
    const user = await userRepository.save({ email: 'cascade.delete@domain.com' });
    const p1 = await authProviderRepository.save({ user: user, provider: 'local', passwordHash: 'hash' });
    const p2 = await authProviderRepository.save({ user: user, provider: 'google', providerId: 'cascade-google-id' });

    let providers = await authProviderRepository.find({ where: { userId: user.id } });
    expect(providers).toHaveLength(2); // Verify providers exist

    // Act: Delete the user
    await userRepository.delete(user.id);

    // Assert: Check that user and associated providers are gone
    const foundUser = await userRepository.findOneBy({ id: user.id });
    expect(foundUser).toBeNull();

    providers = await authProviderRepository.find({ where: { userId: user.id } });
    expect(providers).toHaveLength(0); // Providers should be deleted by cascade

    // Double check they aren't found by their own IDs either
    const foundP1 = await authProviderRepository.findOneBy({ id: p1.id });
    const foundP2 = await authProviderRepository.findOneBy({ id: p2.id });
    expect(foundP1).toBeNull();
    expect(foundP2).toBeNull();
  });
});
