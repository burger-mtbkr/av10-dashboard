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
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/constants.ts',
        'src/theme.ts',
        'src/api/request.ts',
        'src/api/select-smart-preset.ts',
        'src/api/select-speaker-preset.ts',
        'src/api/set-input.ts',
        'src/api/set-mute.ts',
        'src/api/set-volume.ts',
        'src/api/volume-down.ts',
        'src/api/volume-up.ts',
        'src/features/eq/gain-range.ts',
      ],
      exclude: [
        'src/**/*.test.*',
        'src/**/__tests__/**',
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
