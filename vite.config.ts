import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Replace process.env.npm_package_version with a static string
    // This prevents client-side code from trying to fetch package.json
    'process.env.npm_package_version': JSON.stringify('0.0.0'), // Hardcode to prevent runtime lookup
  },
});
