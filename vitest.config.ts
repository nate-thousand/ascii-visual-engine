import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/index.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
      // Floors, set just under the measured numbers on 2026-09-19 so CI fails
      // on a real drop. Raise them as coverage grows; never lower without a reason.
      thresholds: {
        statements: 77,
        branches: 80,
        functions: 69,
        lines: 77,
      },
    },
  },
});
