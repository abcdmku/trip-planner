import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { resolveBackendPort, resolveFrontendPort } from './server/runtime-ports';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = resolveBackendPort({
    nodeEnv: mode,
    configuredPort: env.PORT,
    appUrl: env.APP_URL,
  });
  const frontendPort = Number(
    resolveFrontendPort({
      appUrl: env.APP_URL,
    }),
  );

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${backendPort}`,
          ws: true,
        },
      },
    },
  };
});
