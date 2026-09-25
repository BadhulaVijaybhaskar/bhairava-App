import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } } },
  optimizeDeps: {
    include: ['@bhairava/domain', '@bhairava/api-client'],
  },
  build: {
    commonjsOptions: {
      include: [/packages\/domain/, /packages\/api-client/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
});
