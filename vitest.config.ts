import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'prisma/',
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@config': resolve(__dirname, './src/config'),
      '@modules': resolve(__dirname, './src/modules'),
      '@plugins': resolve(__dirname, './src/plugins'),
      '@middleware': resolve(__dirname, './src/middleware'),
      '@lib': resolve(__dirname, './src/lib'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
});
