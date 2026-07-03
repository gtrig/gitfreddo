import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
      ['src/components/**/*.test.tsx', 'jsdom']
    ],
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'shared/**/*.test.ts', 'electron/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}', 'shared/**/*.ts', 'electron/**/*.ts'],
      exclude: [
        '**/*.test.{ts,tsx}',
        'src/test/**',
        'e2e/**',
        'test/**',
        '**/*.d.ts',
        'src/locales/**'
      ],
      thresholds: {
        lines: 22,
        branches: 64,
        functions: 33,
        statements: 22,
        'src/lib/**': {
          lines: 60,
          branches: 60,
          functions: 50,
          statements: 60
        },
        'shared/**': {
          lines: 40,
          branches: 50,
          functions: 35,
          statements: 40
        },
        'electron/**': {
          lines: 8,
          branches: 55,
          functions: 20,
          statements: 8
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve('src'),
      '@shared': resolve('shared')
    }
  }
})
