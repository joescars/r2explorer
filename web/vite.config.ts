import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mockApi } from './mock/mockApi';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mock = (env.VITE_MOCK ?? process.env.VITE_MOCK) === 'true';
  return {
    plugins: [react(), tailwindcss(), ...(mock ? [mockApi({ readOnly: (env.VITE_MOCK_READONLY ?? process.env.VITE_MOCK_READONLY) === 'true' })] : [])],
    server: {
      host: true,
      port: 5173,
      proxy: mock ? undefined : { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
    },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
