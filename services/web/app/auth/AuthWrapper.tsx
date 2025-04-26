import React from 'react';
import { Outlet } from 'react-router-dom';
import { Skeleton } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';

export const AuthWrapper: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton height="100vh" isLoaded={false} fadeDuration={1} />;
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <Outlet />;
};
