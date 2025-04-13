import { AuthProvider } from '../db/entities/auth/auth-provider.entity';
import { User } from '../db/entities/users/user.entity';

export const mockAuthProvider: AuthProvider = {
  id: 'authId1',
  provider: 'local',
  passwordHash: 'hashedpassword',
  userId: '1',
} as AuthProvider;

export const mockUser: User = {
  id: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
  displayName: null,
  email: 'mock@email.com',
  picture: null,
  authProviders: [mockAuthProvider],
};
