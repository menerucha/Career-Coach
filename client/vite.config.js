import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:4000' } },
  preview: { port: 5173, proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:4000' } },
  build: { rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], radix: ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-accordion', '@radix-ui/react-progress'] } } } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/__tests__/setup.js'], css: false },
});
