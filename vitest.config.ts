import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'electron/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': resolve('src')
    }
  }
})
