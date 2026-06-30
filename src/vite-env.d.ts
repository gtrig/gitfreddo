/// <reference types="vite/client" />

import type { GitFredoAPI } from '../shared/ipc'

declare global {
  interface Window {
    gitfredo: GitFredoAPI
  }
}

export {}
