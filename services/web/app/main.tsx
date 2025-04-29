import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ThemeProvider } from '@theme';
import { AuthProvider } from './auth/AuthProvider';
import { ConfigProvider } from './config/ConfigProvider';
import { AcknowledgeCookies } from './components/AcknowledgeCookies';

const container = document.getElementById('app');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <ThemeProvider>
          <AcknowledgeCookies />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
