import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(root, '../..');

export default defineConfig({
  root,
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(workspace, 'node_modules/react'),
      'react-dom': path.resolve(workspace, 'node_modules/react-dom'),
      zustand: path.resolve(workspace, 'node_modules/zustand'),
    },
  },
  build: {
    outDir: path.resolve(workspace, 'public/sheet'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
