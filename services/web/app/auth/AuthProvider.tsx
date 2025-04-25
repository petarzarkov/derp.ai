import { ReactNode, useState, useCallback, useEffect } from 'react';
import { AuthState, UserProfile, AuthContextValue, AuthContext, AuthProviderType } from './AuthContext';
import { useConfig } from '../hooks/useConfig';

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { serverUrl } = useConfig();
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

  const initiateOAuthLogin = useCallback(
    (provider: AuthProviderType) => {
      window.location.href = `${serverUrl}/api/auth/${provider}`;
    },
    [serverUrl],
  );

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

  const deleteAccount = useCallback(async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`${serverUrl}/api/users/me`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok || response.status !== 204) {
        let errorMsg = `Account deletion failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          /* ignore if no json body */
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unknown deletion error occurred.';
      setAuthState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      throw error;
    }
  }, [serverUrl, logout]);

  const contextValue: AuthContextValue = {
    ...authState,
    login,
    register,
    initiateOAuthLogin,
    logout,
    deleteAccount,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
