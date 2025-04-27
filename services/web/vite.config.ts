import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { version } from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()), VITE_VERSION: version };
  return {
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react'],
            'react-dom': ['react-dom'],
            'react-router-dom': ['react-router-dom'],
            '@chakra-ui/react': ['@chakra-ui/react'],
            '@chakra-ui/icons': ['@chakra-ui/icons'],
            'react-icons': ['react-icons'],
            'react-icons/bs': ['react-icons/bs'],
            'react-icons/gi': ['react-icons/gi'],
            'react-icons/tb': ['react-icons/tb'],
            'react-icons/fa': ['react-icons/fa'],
            'react-icons/vsc': ['react-icons/vsc'],
            'react-icons/ai': ['react-icons/ai'],
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
