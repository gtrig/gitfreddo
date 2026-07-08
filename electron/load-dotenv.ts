import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Minimal .env parser for Electron main.
 * electron-vite only injects VITE_/MAIN_VITE_ keys into import.meta.env;
 * forge credentials use plain process.env names documented in .env.example.
 */
export function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line
    const eq = withoutExport.indexOf('=')
    if (eq <= 0) continue

    const key = withoutExport.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

    let value = withoutExport.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

export function applyEnvEntries(
  entries: Record<string, string>,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): void {
  for (const [key, value] of Object.entries(entries)) {
    if (env[key] === undefined || env[key] === '') {
      env[key] = value
    }
  }
}

/** Load project-root `.env` into process.env (does not override non-empty existing keys). */
export function loadDotEnvFile(cwd: string = process.cwd()): void {
  const filePath = join(cwd, '.env')
  if (!existsSync(filePath)) return

  let content: string
  try {
    content = readFileSync(filePath, 'utf8')
  } catch {
    return
  }

  applyEnvEntries(parseDotEnv(content))
}
