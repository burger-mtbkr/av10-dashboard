import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/core/constants.ts',
        'src/lib/graphic-eq-protocol.ts',
        'src/api/http/fetch-*.ts',
        'src/api/http/get.ts',
        'src/api/http/post-xml.ts',
        'src/api/http/set-speaker-preset.ts',
        'src/api/heos/get-player-id.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
      ],
      thresholds: {
        statements: 85,
        lines: 85,
      },
    },
    include: ['src/**/*.test.ts'],
    testTimeout: 10000,
  },
});
