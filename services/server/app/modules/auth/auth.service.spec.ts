import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../db/entities/users/user.entity';
import { AuthProvider } from '../../db/entities/auth/auth-provider.entity';
import * as bcrypt from 'bcrypt';
import { mockRepository } from '../../fixtures/mockRepository';
import { RegisterRequest } from './auth.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

class CustomError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}
const createMockQueryFailedError = (code: string, message: string) => new CustomError(message, code);

describe('AuthService', () => {
  let service: AuthService;
  let userRepoMock: ReturnType<typeof mockRepository>;
  let authProviderRepoMock: ReturnType<typeof mockRepository>;
  let jwtServiceMock: Partial<JwtService>;

  beforeEach(async () => {
    userRepoMock = mockRepository();
    authProviderRepoMock = mockRepository();
    jwtServiceMock = {
      sign: jest.fn(),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => jest.fn());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: getRepositoryToken(AuthProvider), useValue: authProviderRepoMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    (bcrypt.compare as jest.Mock).mockClear();
    (bcrypt.hash as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateLocalUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashedPassword';
    const userId = 'user-uuid-1';
    const mockDbUser: User = {
      id: userId,
      email: email,
      displayName: 'Test User',
      picture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      authProviders: [], // Relation might not be loaded depending on query
    };
    const mockAuthProvider: AuthProvider = {
      id: 'prov-uuid-1',
      provider: 'local',
      providerId: null,
      userId: userId,
      passwordHash: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockDbUser, // Include the related user
    };

    it('should return sanitized user when credentials are valid', async () => {
      authProviderRepoMock.findOne.mockResolvedValue(mockAuthProvider);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateLocalUser(email, password);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('authProviders');
      expect(result?.id).toEqual(userId);
      expect(result?.email).toEqual(email);
      expect(authProviderRepoMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { provider: 'local', user: { email: email } },
          relations: { user: true },
          select: expect.any(Object), // Verify specific fields if needed
        }),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return null if local provider not found for email', async () => {
      authProviderRepoMock.findOne.mockResolvedValue(null);
      const result = await service.validateLocalUser('notfound@example.com', password);
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if provider found but has no passwordHash', async () => {
      const providerWithoutHash = { ...mockAuthProvider, passwordHash: null };
      authProviderRepoMock.findOne.mockResolvedValue(providerWithoutHash);
      const result = await service.validateLocalUser(email, password);
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password does not match', async () => {
      authProviderRepoMock.findOne.mockResolvedValue(mockAuthProvider);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Password mismatch

      const result = await service.validateLocalUser(email, 'wrongpassword');
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', hashedPassword);
    });

    it('should return null and log error if user relation is missing (safeguard)', async () => {
      const providerWithoutUser = { ...mockAuthProvider, user: undefined }; // Force missing relation
      authProviderRepoMock.findOne.mockResolvedValue(providerWithoutUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Assume password matches

      const result = await service.validateLocalUser(email, password);
      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('User relation not loaded'),
        'AuthService',
      );
    });

    it('should return null and log error on bcrypt error', async () => {
      authProviderRepoMock.findOne.mockResolvedValue(mockAuthProvider);
      const bcryptError = new Error('bcrypt internal error');
      (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError); // Simulate error

      const result = await service.validateLocalUser(email, password);
      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: bcryptError }),
        expect.stringContaining(`Error during local user validation for ${email}`),
        'AuthService',
      );
    });

    it('should return null and log error on repository error', async () => {
      const dbError = new Error('Database connection lost');
      authProviderRepoMock.findOne.mockRejectedValue(dbError);

      const result = await service.validateLocalUser(email, password);
      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: dbError }),
        expect.stringContaining(`Error during local user validation for ${email}`),
        'AuthService',
      );
    });
  });

  describe('findOrCreateUserFromOAuth', () => {
    const oAuthProfile = {
      providerId: 'google123',
      provider: 'google',
      email: 'oauth.test@example.com',
      displayName: 'OAuth User',
      picture: 'http://new.picture.url',
    };
    const existingUserId = 'user-uuid-oauth';
    const existingUser: User = {
      id: existingUserId,
      email: oAuthProfile.email,
      displayName: 'Old Name',
      picture: 'http://old.picture.url',
      createdAt: new Date(),
      updatedAt: new Date(),
      authProviders: [],
    };
    const mockProviderLink: AuthProvider = {
      id: 'prov-link-id',
      provider: oAuthProfile.provider,
      providerId: oAuthProfile.providerId,
      userId: existingUserId,
      passwordHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: existingUser,
    };

    it('should return existing user and update details if AuthProvider link found and details changed', async () => {
      authProviderRepoMock.findOne.mockResolvedValue(mockProviderLink);
      const updatedUser = { ...existingUser, displayName: oAuthProfile.displayName, picture: oAuthProfile.picture };
      userRepoMock.save.mockResolvedValue(updatedUser); // Mock the save operation returning the updated user

      const result = await service.findOrCreateUserFromOAuth(
        oAuthProfile.providerId,
        oAuthProfile.provider,
        oAuthProfile.email,
        oAuthProfile.displayName,
        oAuthProfile.picture,
      );

      expect(result.id).toEqual(existingUserId);
      expect(result.displayName).toEqual(oAuthProfile.displayName);
      expect(result.picture).toEqual(oAuthProfile.picture);
      expect(authProviderRepoMock.findOne).toHaveBeenCalledWith({
        where: { provider: oAuthProfile.provider, providerId: oAuthProfile.providerId },
        relations: { user: true },
      });
      expect(userRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingUserId, // Ensure saving the correct user
          displayName: oAuthProfile.displayName,
          picture: oAuthProfile.picture,
        }),
      );
      expect(userRepoMock.findOne).not.toHaveBeenCalled(); // Should not search User table again
      expect(authProviderRepoMock.create).not.toHaveBeenCalled();
      expect(authProviderRepoMock.save).not.toHaveBeenCalled(); // AuthProvider itself wasn't saved/created
    });

    it('should return existing user without updating if details are the same', async () => {
      const providerLinkWithSameDetails = {
        ...mockProviderLink,
        user: { ...existingUser, displayName: oAuthProfile.displayName, picture: oAuthProfile.picture },
      };
      authProviderRepoMock.findOne.mockResolvedValue(providerLinkWithSameDetails);

      const result = await service.findOrCreateUserFromOAuth(
        oAuthProfile.providerId,
        oAuthProfile.provider,
        oAuthProfile.email,
        oAuthProfile.displayName,
        oAuthProfile.picture,
      );

      expect(result.id).toEqual(existingUserId);
      expect(result.displayName).toEqual(oAuthProfile.displayName);
      expect(userRepoMock.save).not.toHaveBeenCalled(); // No save needed
      expect(authProviderRepoMock.findOne).toHaveBeenCalledTimes(1);
      expect(userRepoMock.findOne).not.toHaveBeenCalled();
      expect(authProviderRepoMock.create).not.toHaveBeenCalled();
      expect(authProviderRepoMock.save).not.toHaveBeenCalled();
    });

    it('should link provider to existing user found by email if provider link not found', async () => {
      authProviderRepoMock.findOne.mockResolvedValueOnce(null); // No provider link
      userRepoMock.findOne.mockResolvedValueOnce(existingUser); // User found by email
      const createdLink = {
        userId: existingUser.id,
        provider: oAuthProfile.provider,
        providerId: oAuthProfile.providerId,
      };
      authProviderRepoMock.create.mockReturnValue(createdLink);
      authProviderRepoMock.save.mockResolvedValue({ ...createdLink, id: 'new-link-id' }); // Mock successful save

      const result = await service.findOrCreateUserFromOAuth(
        oAuthProfile.providerId,
        oAuthProfile.provider,
        oAuthProfile.email,
        oAuthProfile.displayName,
        oAuthProfile.picture,
      );

      expect(result.id).toEqual(existingUser.id); // Returns the existing user
      expect(authProviderRepoMock.findOne).toHaveBeenCalledTimes(1); // Checked for provider link
      expect(userRepoMock.findOne).toHaveBeenCalledTimes(1); // Checked for user by email
      expect(authProviderRepoMock.create).toHaveBeenCalledWith({
        userId: existingUser.id,
        provider: oAuthProfile.provider,
        providerId: oAuthProfile.providerId,
        passwordHash: null, // Important: no password hash for OAuth
      });
      expect(authProviderRepoMock.save).toHaveBeenCalledWith(createdLink);
      expect(userRepoMock.create).not.toHaveBeenCalled(); // Did not create a new user
      // Add check for user profile update if that logic is added here
    });

    it('should create new user and provider link if neither user nor link found', async () => {
      authProviderRepoMock.findOne.mockResolvedValueOnce(null); // No provider link
      userRepoMock.findOne.mockResolvedValueOnce(null); // No user by email

      const newUserPartial = {
        email: oAuthProfile.email,
        displayName: oAuthProfile.displayName,
        picture: oAuthProfile.picture,
      };
      const createdUser = {
        ...newUserPartial,
        id: 'new-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        authProviders: [],
      };
      const newLinkPartial = {
        userId: createdUser.id,
        provider: oAuthProfile.provider,
        providerId: oAuthProfile.providerId,
        passwordHash: null,
      };
      const createdLink = { ...newLinkPartial, id: 'new-link-id', createdAt: new Date(), updatedAt: new Date() };

      userRepoMock.create.mockReturnValue(newUserPartial); // Mock create return
      userRepoMock.save.mockResolvedValue(createdUser); // Mock save return
      authProviderRepoMock.create.mockReturnValue(newLinkPartial); // Mock create return
      authProviderRepoMock.save.mockResolvedValue(createdLink); // Mock save return

      const result = await service.findOrCreateUserFromOAuth(
        oAuthProfile.providerId,
        oAuthProfile.provider,
        oAuthProfile.email,
        oAuthProfile.displayName,
        oAuthProfile.picture,
      );

      expect(result.id).toEqual(createdUser.id);
      expect(result.email).toEqual(oAuthProfile.email);
      expect(userRepoMock.create).toHaveBeenCalledWith(newUserPartial);
      expect(userRepoMock.save).toHaveBeenCalledWith(newUserPartial);
      expect(authProviderRepoMock.create).toHaveBeenCalledWith(newLinkPartial);
      expect(authProviderRepoMock.save).toHaveBeenCalledWith(newLinkPartial);
    });

    it('should handle unique constraint violation (race condition) by refetching', async () => {
      const constraintError = createMockQueryFailedError('23505', 'duplicate key value violates unique constraint');
      authProviderRepoMock.findOne.mockResolvedValueOnce(null);
      userRepoMock.findOne.mockResolvedValueOnce(existingUser);
      authProviderRepoMock.create.mockReturnValue({ userId: existingUser.id });
      authProviderRepoMock.save.mockRejectedValueOnce(constraintError);

      authProviderRepoMock.findOne.mockResolvedValueOnce(mockProviderLink);

      const result = await service.findOrCreateUserFromOAuth(
        oAuthProfile.providerId,
        oAuthProfile.provider,
        oAuthProfile.email,
        oAuthProfile.displayName,
        oAuthProfile.picture,
      );

      expect(result.id).toEqual(existingUser.id);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: constraintError, email: oAuthProfile.email }),
        expect.stringContaining('Possible race condition or constraint violation'),
        'AuthService',
      );
      // Ensure findOne was called twice for AuthProvider (initial + recovery)
      expect(authProviderRepoMock.findOne).toHaveBeenCalledTimes(2);
      // Ensure findOne was called once for User (initial check by email)
      expect(userRepoMock.findOne).toHaveBeenCalledTimes(1);
      // Ensure save was attempted once
      expect(authProviderRepoMock.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if recovery after constraint violation fails', async () => {
      const constraintError = createMockQueryFailedError('23505', 'duplicate key value violates unique constraint');
      authProviderRepoMock.findOne.mockResolvedValueOnce(null); // Step 1: No link
      userRepoMock.findOne.mockResolvedValueOnce(existingUser); // Step 2: Found user by email
      authProviderRepoMock.create.mockReturnValue({ userId: existingUser.id /*...*/ });
      authProviderRepoMock.save.mockRejectedValueOnce(constraintError); // Step 3: Save fails (race)

      // Step 4: Recovery - Simulate recovery also fails
      authProviderRepoMock.findOne.mockResolvedValueOnce(null); // Recovery findProvider fails
      userRepoMock.findOne.mockResolvedValueOnce(null); // Recovery findUser fails

      await expect(
        service.findOrCreateUserFromOAuth(
          oAuthProfile.providerId,
          oAuthProfile.provider,
          oAuthProfile.email,
          oAuthProfile.displayName,
          oAuthProfile.picture,
        ),
      ).rejects.toThrow(ConflictException);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: constraintError, email: oAuthProfile.email }),
        expect.stringContaining('Possible race condition or constraint violation'),
        'AuthService',
      );
      expect(authProviderRepoMock.findOne).toHaveBeenCalledTimes(2); // initial + recovery attempt
      expect(userRepoMock.findOne).toHaveBeenCalledTimes(2); // initial + recovery attempt
    });

    it('should throw InternalServerErrorException on unexpected repository error', async () => {
      const dbError = new Error('Unexpected DB Error');
      authProviderRepoMock.findOne.mockRejectedValue(dbError); // Simulate error on first find

      await expect(
        service.findOrCreateUserFromOAuth(
          oAuthProfile.providerId,
          oAuthProfile.provider,
          oAuthProfile.email,
          oAuthProfile.displayName,
          oAuthProfile.picture,
        ),
      ).rejects.toThrow(InternalServerErrorException);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: dbError }), // First arg is object with error
        expect.stringContaining(
          `Error in findOrCreateUserFromOAuth for ${oAuthProfile.provider} user ${oAuthProfile.email}`,
        ),
        'AuthService',
      );
    });
  });

  // --- registerLocalUser Tests ---
  describe('registerLocalUser', () => {
    const registerDto: RegisterRequest = {
      email: 'register@example.com',
      password: 'password123',
      displayName: 'Register User',
    };
    const hashedPassword = 'hashedPassword123';
    const newUserId = 'reg-uuid-1';
    const createdUser: User = {
      id: newUserId,
      email: registerDto.email,
      displayName: registerDto.displayName!,
      picture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      authProviders: [],
    };
    const createdProvider: AuthProvider = {
      id: 'reg-prov-uuid',
      userId: newUserId,
      provider: 'local',
      providerId: null,
      passwordHash: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: createdUser, // Link back - might not be needed for mock return value
    };

    beforeEach(() => {
      // Mock bcrypt hash for registration tests
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
    });

    it('should create new user and local provider, returning sanitized user', async () => {
      userRepoMock.findOne.mockResolvedValue(null); // No existing user by email
      userRepoMock.create.mockReturnValue({ email: registerDto.email, displayName: registerDto.displayName } as User); // Mock create args
      userRepoMock.save.mockResolvedValue(createdUser); // Mock user save result
      authProviderRepoMock.create.mockReturnValue({
        userId: newUserId,
        provider: 'local',
        passwordHash: hashedPassword,
      } as AuthProvider); // Mock provider create args
      authProviderRepoMock.save.mockResolvedValue(createdProvider); // Mock provider save result

      const result = await service.registerLocalUser(registerDto);

      expect(result).toBeDefined();
      expect(result.id).toEqual(newUserId);
      expect(result.email).toEqual(registerDto.email);
      expect(result.displayName).toEqual(registerDto.displayName);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('authProviders');

      expect(userRepoMock.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(userRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: registerDto.email, displayName: registerDto.displayName }),
      );
      expect(userRepoMock.save).toHaveBeenCalled();
      expect(authProviderRepoMock.create).toHaveBeenCalledWith({
        userId: newUserId,
        provider: 'local',
        providerId: null,
        passwordHash: hashedPassword,
      });
      expect(authProviderRepoMock.save).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith('RootTestModule dependencies initialized');
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(`Registered new local user: ${registerDto.email}`),
        'AuthService',
      );
    });

    it('should use default displayName if not provided', async () => {
      const dtoWithoutName: RegisterRequest = { email: 'noname@example.com', password: 'pw' };
      const defaultName = 'noname';
      const createdUserWithDefaultName = {
        ...createdUser,
        email: dtoWithoutName.email,
        displayName: defaultName,
        id: 'reg-uuid-2',
      };

      userRepoMock.findOne.mockResolvedValue(null);
      userRepoMock.create.mockReturnValue({ email: dtoWithoutName.email, displayName: defaultName } as User);
      userRepoMock.save.mockResolvedValue(createdUserWithDefaultName);
      authProviderRepoMock.create.mockReturnValue({
        userId: createdUserWithDefaultName.id,
        provider: 'local',
        passwordHash: hashedPassword,
      } as AuthProvider);
      authProviderRepoMock.save.mockResolvedValue({} as AuthProvider); // Minimal mock ok here

      const result = await service.registerLocalUser(dtoWithoutName);

      expect(result.displayName).toEqual(defaultName);
      expect(userRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({ displayName: defaultName }));
    });

    it('should throw ConflictException if user exists and already has a local provider', async () => {
      const existingUserWithLocal: User = { ...createdUser, id: 'existing-local-user' };
      const existingLocalProvider: AuthProvider = { ...createdProvider, userId: existingUserWithLocal.id };

      userRepoMock.findOne.mockResolvedValue(existingUserWithLocal); // User found
      authProviderRepoMock.findOne.mockResolvedValue(existingLocalProvider); // Local provider found

      await expect(service.registerLocalUser(registerDto)).rejects.toThrow(
        new ConflictException(`User with email ${registerDto.email} already registered locally.`),
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepoMock.save).not.toHaveBeenCalled();
      expect(authProviderRepoMock.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user exists (e.g., via OAuth) but has no local provider', async () => {
      const existingUserOAuth: User = { ...createdUser, id: 'existing-oauth-user' };

      userRepoMock.findOne.mockResolvedValue(existingUserOAuth); // User found
      authProviderRepoMock.findOne.mockResolvedValue(null); // NO local provider found

      await expect(service.registerLocalUser(registerDto)).rejects.toThrow(
        new ConflictException(
          `Email ${registerDto.email} is already associated with an existing account. Try logging in or use a different email.`,
        ),
      );
      expect(authProviderRepoMock.findOne).toHaveBeenCalledWith({
        where: { userId: existingUserOAuth.id, provider: 'local' },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepoMock.save).not.toHaveBeenCalled();
      expect(authProviderRepoMock.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on user save unique constraint violation (race condition)', async () => {
      const constraintError = createMockQueryFailedError(
        '23505',
        'duplicate key value violates unique constraint users_email_key',
      );
      userRepoMock.findOne.mockResolvedValue(null); // Initially not found
      userRepoMock.create.mockReturnValue({} as User);
      userRepoMock.save.mockRejectedValue(constraintError); // Save fails due to race
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await expect(service.registerLocalUser(registerDto)).rejects.toThrow(
        new ConflictException(`Email ${registerDto.email} is already registered. Please try logging in.`),
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('Registration failed due to race condition'),
        'AuthService',
      );
      expect(authProviderRepoMock.save).not.toHaveBeenCalled(); // Provider save should not be reached
    });

    it('should throw InternalServerErrorException on unexpected user save error', async () => {
      const dbError = new Error('DB connection error');
      userRepoMock.findOne.mockResolvedValue(null);
      userRepoMock.create.mockReturnValue({} as User);
      userRepoMock.save.mockRejectedValue(dbError); // Simulate error
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await expect(service.registerLocalUser(registerDto)).rejects.toThrow(InternalServerErrorException);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: dbError,
        }),
        expect.stringContaining('Error creating user during registration'),
        'AuthService',
      );
    });

    it('should throw InternalServerErrorException and log error if provider save fails', async () => {
      const providerSaveError = new Error('Failed saving auth provider');
      userRepoMock.findOne.mockResolvedValue(null);
      userRepoMock.create.mockReturnValue({} as User);
      userRepoMock.save.mockResolvedValue(createdUser);
      authProviderRepoMock.create.mockReturnValue({} as AuthProvider);
      authProviderRepoMock.save.mockRejectedValue(providerSaveError); // Provider save fails
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      await expect(service.registerLocalUser(registerDto)).rejects.toThrow(
        new InternalServerErrorException('Failed to finalize user registration. Please try again later.'),
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: providerSaveError,
        }),
        expect.stringContaining(`Failed to create local auth provider for user ${createdUser.id}`),
        'AuthService',
      );
    });
  });

  // --- login (JWT Generation) Tests ---
  describe('login (JWT Generation)', () => {
    it('should generate and return JWT token for a valid user partial', async () => {
      const userPartial = { id: 'user-jwt-id', email: 'jwt@test.com' };
      const mockToken = 'mock.jwt.token';
      (jwtServiceMock.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await service.login(userPartial);

      expect(result).toEqual({ accessToken: mockToken });
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({ sub: userPartial.id, email: userPartial.email });
    });

    it('should throw UnauthorizedException if user object is null or undefined', async () => {
      await expect(service.login(null as unknown as Partial<User>)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(undefined as unknown as Partial<User>)).rejects.toThrow(UnauthorizedException);
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user object lacks id', async () => {
      const userPartial = { email: 'jwt@test.com' };
      await expect(service.login(userPartial as unknown as Partial<User>)).rejects.toThrow(UnauthorizedException);
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user object lacks email', async () => {
      const userPartial = { id: 'user-jwt-id' };
      await expect(service.login(userPartial as unknown as Partial<User>)).rejects.toThrow(UnauthorizedException);
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });
  });

  // --- validateUserById (for JwtStrategy) Tests ---
  describe('validateUserById', () => {
    const userId = 'jwt-user-id';
    const mockDbUser: User = {
      id: userId,
      email: 'jwt.val@test.com',
      displayName: 'JWT Val',
      picture: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      authProviders: [],
    };

    it('should return sanitized user if found by ID', async () => {
      userRepoMock.findOne.mockResolvedValue(mockDbUser);
      const result = await service.validateUserById(userId);
      expect(result).toBeDefined();
      expect(result?.id).toEqual(userId);
      expect(result?.email).toEqual(mockDbUser.email);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('authProviders');
      expect(userRepoMock.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should return null if user not found by ID', async () => {
      userRepoMock.findOne.mockResolvedValue(null);
      const result = await service.validateUserById('not-a-real-id');
      expect(result).toBeNull();
    });

    it('should return null and log error if repository throws error', async () => {
      const dbError = new Error('DB Error during JWT validation');
      userRepoMock.findOne.mockRejectedValue(dbError);
      const result = await service.validateUserById(userId);
      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: dbError,
        }),
        expect.stringContaining(`Error validating user by ID ${userId}`),
        'AuthService',
      );
    });
  });

  // --- sanitizeUser Tests (implicitly tested, but can add direct tests if needed) ---
  describe('sanitizeUser (private method)', () => {
    it('should return object with only allowed fields', () => {
      const fullUser: User = {
        id: 'sanitize-id',
        email: 'sanitize@test.com',
        displayName: 'Sanitize Me',
        picture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add a mock authProvider to test its removal
        authProviders: [
          {
            id: 'prov-sanitize',
            userId: 'sanitize-id',
            provider: 'local',
            providerId: null,
            passwordHash: 'secretHash',
            createdAt: new Date(),
            updatedAt: new Date(),
            user: undefined as unknown as User, // Avoid circular ref in test data
          },
        ],
      };
      const sanitized = service.sanitizeUser(fullUser);

      expect(sanitized).toEqual({
        id: fullUser.id,
        email: fullUser.email,
        displayName: fullUser.displayName,
        picture: fullUser.picture,
        createdAt: fullUser.createdAt,
        updatedAt: fullUser.updatedAt,
      });
      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized).not.toHaveProperty('authProviders');
      expect(sanitized).not.toHaveProperty('accessToken'); // Ensure other sensitive fields aren't there either
    });

    it('should return null if input is null', () => {
      const sanitized = service.sanitizeUser(null as unknown as User);
      expect(sanitized).toBeNull();
    });
  });
});
