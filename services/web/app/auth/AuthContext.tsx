import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  picture: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (displayName: string, email: string, password: string) => Promise<boolean>;
  initiateGoogleLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, serverUrl }) => {
  const [authState, setAuthState] = useState<AuthState>({
    currentUser: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const fetchCurrentUser = useCallback(async () => {
    const response = await fetch(`${serverUrl}/api/users/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (response.ok) {
      const user: UserProfile = await response.json();
      return user;
    } else if (response.status === 401) {
      return null;
    } else {
      throw new Error(`Failed to fetch user status: ${response.status}`);
    }
  }, [serverUrl]);

  // Check authentication status when the provider mounts
  useEffect(() => {
    let isMounted = true;
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    fetchCurrentUser()
      .then((user) => {
        if (isMounted) {
          setAuthState({
            currentUser: user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        console.error('Error checking auth status:', err);
        if (isMounted) {
          setAuthState({
            currentUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to check login status.',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchCurrentUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const authRes = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        if (!authRes.ok) {
          let errorMsg = `Login failed: ${authRes.status}`;
          try {
            const errorData = await authRes.json();
            errorMsg = errorData.message || errorMsg;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
          } catch (_) {}
          throw new Error(errorMsg);
        }

        const user: UserProfile = await authRes.json();
        setAuthState({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (error) {
        console.error('Login error:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unknown login error occurred.';
        setAuthState({
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    },
    [serverUrl],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string): Promise<boolean> => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const regRes = await fetch(`${serverUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, email, password }),
          credentials: 'include',
        });

        if (!regRes.ok) {
          let errorMsg = `Registration failed: ${regRes.status}`;
          try {
            const errorData = await regRes.json();
            errorMsg = errorData.message || errorMsg;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
          } catch (_) {}
          throw new Error(errorMsg);
        }
        const user: UserProfile = await regRes.json();

        setAuthState({
          currentUser: user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (error) {
        console.error('Registration error:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unknown registration error occurred.';
        setAuthState({
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    },
    [serverUrl],
  );

  const initiateGoogleLogin = useCallback(() => {
    window.location.href = `${serverUrl}/api/auth/google`;
  }, [serverUrl]);

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      const logoutRes = await fetch(`${serverUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!logoutRes.ok) {
        console.warn(`Logout request failed: ${logoutRes.status}`);
      }
    } catch (error) {
      console.error('Logout fetch error:', error);
    } finally {
      setAuthState({
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [serverUrl]);

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    register,
    initiateGoogleLogin,
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
