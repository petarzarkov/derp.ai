import React from 'react';
import { Outlet } from 'react-router-dom';
import { Skeleton } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';
import { SocketProvider } from '../socket/SocketProvider';

interface AuthWrapperProps {
  serverUrl: string;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ serverUrl }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton height="100vh" isLoaded={false} fadeDuration={1} />;
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <SocketProvider serverUrl={serverUrl}>
      <Outlet />
    </SocketProvider>
  );
};
