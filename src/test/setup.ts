import '@testing-library/jest-dom/vitest'
import { createGitFreddoMock } from './mocks/gitfreddo'

if (typeof window !== 'undefined') {
  window.gitfreddo = createGitFreddoMock()
}
