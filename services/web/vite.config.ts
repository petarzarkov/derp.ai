import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { version } from './package.json';
import langs from 'react-syntax-highlighter/dist/esm/languages/hljs/supported-languages';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()), VITE_VERSION: version };
  return {
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'react-icons'],
            ui: ['@chakra-ui/icons', '@chakra-ui/react'],
            ...langs.reduce((acc: Record<string, string[]>, lang: string) => {
              acc[`react-syntax-highlighter/dist/esm/languages/hljs/${lang}`] = [
                `react-syntax-highlighter/dist/esm/languages/hljs/${lang}`,
              ];
              return acc;
            }, {}),
          },
        },
      },
    },
    resolve: {
      alias: {
        '@animations': path.resolve(__dirname, './app/animations'),
        '@components': path.resolve(__dirname, './app/components'),
        '@contracts': path.resolve(__dirname, './app/contracts'),
        '@hooks': path.resolve(__dirname, './app/hooks'),
        '@screens': path.resolve(__dirname, './app/screens'),
        '@config': path.resolve(__dirname, './app/config'),
        '@theme': path.resolve(__dirname, './app/theme'),
        '@store': path.resolve(__dirname, './app/store'),
      },
    },
    plugins: [react()],
  };
});
