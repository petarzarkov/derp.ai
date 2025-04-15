import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ThemeProvider } from '@theme';
import { SocketProvider } from './socket/SocketContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { Skeleton } from '@chakra-ui/react';

const container = document.getElementById('app');
const root = createRoot(container!);
const serverUrl =
  window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')
    ? 'http://localhost:3033'
    : window.location.origin;

const AuthWrapper: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Skeleton height="100vh" isLoaded={!isLoading} fadeDuration={1}></Skeleton>;
  }
  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <SocketProvider serverUrl={serverUrl}>
      <App />
    </SocketProvider>
  );
};

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider serverUrl={serverUrl}>
          <AuthWrapper />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
