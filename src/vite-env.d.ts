/// <reference types="vite/client" />

import type { GitFreddoAPI } from '@shared/ipc'

declare global {
  interface Window {
    gitfreddo: GitFreddoAPI
  }
}

export {}
