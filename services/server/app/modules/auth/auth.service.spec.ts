import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../db/entities/users/user.entity';
import * as bcrypt from 'bcrypt';
import { mockRepository } from '../../fixtures/mockRepository';
import { mockUser } from '../../fixtures/mockUsers';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => jest.fn());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', mockUser.passwordHash);
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw Unauthorized on error', async () => {
      (bcrypt.compare as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Some bcrypt error');
      });

      await expect(service.validateUser('testuser', 'wrongpassword')).rejects.toThrow('Unauthorized');
    });
  });

  describe('login', () => {
    it('should generate token and save it to user', async () => {
      const mockToken = 'jwt.token.here';
      mockJwtService.sign.mockReturnValue(mockToken);
      mockRepository.save.mockResolvedValue({ ...mockUser, jwtToken: mockToken });

      const result = await service.login({
        ...mockUser,
      });

      expect(result).toEqual({ accessToken: mockToken });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        createdAt: mockUser.createdAt,
        username: mockUser.username,
        sub: mockUser.id,
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        jwtToken: mockToken,
      });
    });

    it('should throw Unauthorized on error', async () => {
      mockJwtService.sign.mockImplementationOnce(() => {
        throw new Error('some jwt sign error');
      });

      await expect(
        service.login({
          ...mockUser,
        }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('validateToken', () => {
    it('should return jwt payload when token is valid', async () => {
      const mockToken = 'valid.token';
      const mockPayload = { sub: mockUser.id, username: mockUser.username, createdAt: mockUser.createdAt };
      mockJwtService.verify.mockReturnValue(mockPayload);
      // mockRepository.findOne.mockResolvedValue({ ...mockUser, jwtToken: mockToken });

      const result = await service.validateToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
      // expect(mockRepository.findOne).toHaveBeenCalledWith({
      //   where: { id: mockPayload.sub },
      // });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid.token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when jwt payload decode error', async () => {
      const mockToken = 'valid.token';
      mockJwtService.verify.mockReturnValue(null);

      await expect(service.validateToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it.skip('should throw UnauthorizedException when user not found', async () => {
      const mockToken = 'valid.token';
      const mockPayload = { sub: 'nonexistent' };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.validateToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });

    it.skip('should throw UnauthorizedException when token mismatch', async () => {
      const mockToken = 'valid.token';
      const mockPayload = { sub: mockUser.id };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockRepository.findOne.mockResolvedValue({ ...mockUser, jwtToken: 'different.token' });

      await expect(service.validateToken(mockToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
