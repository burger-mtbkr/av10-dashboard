/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    /** Fork workers occasionally hang on Windows; threads pool is more reliable here. */
    pool: 'threads',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/types/constants.ts',
        'src/theme/index.ts',
        'src/api/http/request.ts',
        'src/api/http/select-smart-preset.ts',
        'src/api/http/select-speaker-preset.ts',
        'src/api/http/set-input.ts',
        'src/api/http/set-mute.ts',
        'src/api/http/set-volume.ts',
        'src/api/http/volume-down.ts',
        'src/api/http/volume-up.ts',
        'src/features/eq/gain-range.ts',
      ],
      exclude: [
        'src/**/*.test.*',
        'src/test/**',
        'src/main.tsx',
      ],
      thresholds: {
        statements: 85,
        lines: 85,
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 10000,
  },
});
