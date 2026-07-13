import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const alias = {
  '@': resolve('src'),
  '@shared': resolve('shared')
}

const coverageInclude = ['src/**/*.{ts,tsx}', 'shared/**/*.ts', 'electron/**/*.ts']
const coverageExclude = [
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
]

export default defineConfig({
  resolve: { alias },
  test: {
    // Root-level options (reporters, coverage) apply to all projects.
    reporters: process.env.CI
      ? 'default'
      : [['default', { summary: false }]],
    outputDiffLines: 25,
    outputDiffMaxSize: 20_000,
    slowTestThreshold: 5_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      include: coverageInclude,
      exclude: coverageExclude,
      thresholds: {
        lines: 95,
        branches: 80,
        functions: 70,
        statements: 85,
        'src/lib/**': {
          lines: 95,
          branches: 70,
          functions: 75,
          statements: 85
        },
        'shared/**': {
          lines: 95,
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
    },
    projects: [
      {
        extends: true,
        resolve: { alias },
        test: {
          name: { label: 'unit', color: 'green' },
          environment: 'node',
          pool: 'threads',
          testTimeout: process.env.CI ? 30_000 : 5_000,
          include: [
            'electron/**/*.test.ts',
            'shared/**/*.test.ts',
            'src/lib/**/*.test.ts',
            'src/locales/**/*.test.ts'
          ],
          setupFiles: ['src/test/setup.node.ts']
        }
      },
      {
        extends: true,
        resolve: { alias },
        test: {
          name: { label: 'renderer', color: 'cyan' },
          environment: 'jsdom',
          pool: 'threads',
          include: [
            'src/components/**/*.test.{ts,tsx}',
            'src/hooks/**/*.test.{ts,tsx}',
            'src/stores/**/*.test.{ts,tsx}'
          ],
          setupFiles: ['src/test/setup.ts']
        }
      }
    ]
  }
})
