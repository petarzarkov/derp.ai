/* eslint-disable @typescript-eslint/no-unused-vars */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { version, dependencies } from './package.json';

const {
  react: g,
  'react-dom': g2,
  'react-router-dom': g3,
  'react-icons': g4,
  '@chakra-ui/react': g5,
  '@chakra-ui/icons': g6,
  '@common': g7,
  ...rest
} = dependencies;

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
            ui: ['@chakra-ui/react', '@chakra-ui/icons'],
            'react-syntax-highlighter/dist/esm/styles/hljs': ['react-syntax-highlighter/dist/esm/styles/hljs'],
            ...Object.keys(rest).reduce((acc, lib) => {
              acc[lib] = [lib];
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
