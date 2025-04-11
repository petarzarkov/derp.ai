import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';

interface AuthState {
  authToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, serverUrl }) => {
  const [authState, setAuthState] = useState<AuthState>({
    authToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const login = useCallback(
    async (username: string, password: string) => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const authRes = await fetch(`${serverUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!authRes.ok) {
          const errorText = await authRes.text();
          throw new Error(`Authentication failed: ${authRes.status} - ${errorText}`);
        }

        const data = await authRes.json();
        if (data && typeof data.accessToken === 'string') {
          setAuthState({
            authToken: data.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error('Token not found in auth response');
        }
      } catch (error) {
        console.error('Login error:', error);
        setAuthState({
          authToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error : new Error('An unknown error occurred during login'),
        });
      }
    },
    [serverUrl],
  );

  const logout = useCallback(() => {
    setAuthState({
      authToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    // Optionally redirect user to login page
  }, []);

  useEffect(() => {
    login('alice', 'alice');
    setAuthState((prev) => ({ ...prev, isLoading: false }));
  }, [login]);

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
