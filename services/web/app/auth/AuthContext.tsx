import { ChatHistoryItem } from '../socket/Chat.types';
import { createContext } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
  latestChatMessages: ChatHistoryItem[];
}

export type AuthProviderType = 'google' | 'github' | 'linkedin';

export interface AuthState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (displayName: string, email: string, password: string) => Promise<boolean>;
  initiateOAuthLogin: (provider: AuthProviderType) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
