import { loadDotEnvFile } from '../electron/load-dotenv.ts'
import {
  formatMissingForgeOAuthBakeEnvError,
  missingForgeOAuthBakeEnvKeys
} from '../electron/forge-oauth-bake-guard.ts'

// Local: pick up project-root .env. CI: job env already has Actions secrets.
loadDotEnvFile()

const missing = missingForgeOAuthBakeEnvKeys(process.env)
if (missing.length > 0) {
  console.error(formatMissingForgeOAuthBakeEnvError(missing))
  process.exit(1)
}

console.log('Forge OAuth bake env OK (GitHub, Bitbucket, GitLab credentials present).')
