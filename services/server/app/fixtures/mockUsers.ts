import { User } from '../db/entities/users/user.entity';

export const mockCreateUser = {
  username: 'testuser',
  passwordHash: 'hashedpassword',
  jwtToken: 'jwt.token',
};

export const mockUser: User = {
  id: '1',
  ...mockCreateUser,
  createdAt: new Date(),
  updatedAt: new Date(),
};
