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
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: false,
  },
  define: {
    // Replace process.env.npm_package_version with a static string
    // This prevents client-side code from trying to fetch package.json
    'process.env.npm_package_version': JSON.stringify('0.0.0'), // Hardcode to prevent runtime lookup
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (id.includes('node_modules')) {
            if (
              /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
                normalizedId
              )
            ) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
          }
          return undefined;
        },
      },
      onwarn(warning, warn) {
        const message = warning.message ?? '';
        const fromSupabaseWrapper =
          warning.code === 'MISSING_EXPORT' &&
          warning.id?.includes('@supabase/supabase-js/dist/esm/wrapper.mjs');
        const noisyPureCommentWarning =
          warning.code === 'INVALID_ANNOTATION' &&
          message.includes('contains an annotation that Rollup cannot interpret');

        if (fromSupabaseWrapper || noisyPureCommentWarning) {
          return;
        }
        warn(warning);
      },
    },
  },
});
