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
        'src/locales/**',
        // Electron/renderer bootstrap — covered by E2E smoke, not unit-testable in isolation
        'electron/main/**',
        'electron/preload/**',
        'src/main.tsx',
        'src/theme-boot.ts',
        'src/App.tsx',
        // Heavy conflict UI — covered by dedicated lib/conflicts tests and E2E
        'src/components/DiffViewer/ConflictMergeOverlay.tsx'
      ],
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 70,
        statements: 85,
        'src/lib/**': {
          lines: 90,
          branches: 70,
          functions: 75,
          statements: 85
        },
        'shared/**': {
          lines: 90,
          branches: 65,
          functions: 85,
          statements: 80
        },
        'electron/**': {
          lines: 90,
          branches: 60,
          functions: 40,
          statements: 45
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
