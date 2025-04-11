import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ThemeProvider } from '@theme';
import { SocketProvider } from './socket/SocketContext';
import { AuthProvider } from './auth/AuthContext';

const container = document.getElementById('app');
const root = createRoot(container!);
const serverUrl = window.location.host.includes('localhost') ? 'http://localhost:3033' : window.location.host;

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider serverUrl={serverUrl}>
          <SocketProvider serverUrl={serverUrl}>
            <App />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
