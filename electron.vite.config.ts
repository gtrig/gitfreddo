import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function quoteEnv(value: string | undefined): string {
  return JSON.stringify(value?.trim() ?? '')
}

export default defineConfig(({ mode }) => {
  // Load all .env keys (not only VITE_/MAIN_VITE_) so local OAuth credentials bake in for preview builds.
  const env = loadEnv(mode, process.cwd(), '')
  const githubClientId = env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || ''
  const bitbucketClientId = env.BITBUCKET_CLIENT_ID || process.env.BITBUCKET_CLIENT_ID || ''
  const bitbucketClientSecret =
    env.BITBUCKET_CLIENT_SECRET || process.env.BITBUCKET_CLIENT_SECRET || ''

  const forgeOAuthDefines = {
    'process.env.GITFREDDO_BUILD_GITHUB_CLIENT_ID': quoteEnv(githubClientId),
    'process.env.GITFREDDO_BUILD_BITBUCKET_CLIENT_ID': quoteEnv(bitbucketClientId),
    'process.env.GITFREDDO_BUILD_BITBUCKET_CLIENT_SECRET': quoteEnv(bitbucketClientSecret)
  }

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: forgeOAuthDefines,
      build: {
        lib: {
          entry: resolve('electron/main/index.ts')
        }
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        lib: {
          entry: resolve('electron/preload/index.ts')
        }
      }
    },
    renderer: {
      root: resolve('src'),
      publicDir: resolve('assets'),
      build: {
        rollupOptions: {
          input: resolve('src/index.html')
        }
      },
      resolve: {
        alias: {
          '@': resolve('src'),
          '@shared': resolve('shared')
        }
      },
      plugins: [react(), tailwindcss()]
    }
  }
})
