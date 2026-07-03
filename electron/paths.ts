import { homedir } from 'os'
import { join } from 'path'

export function resolveAppDataDir(
  platform: NodeJS.Platform = process.platform,
  home: string = homedir()
): string {
  switch (platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'gitfreddo')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'gitfreddo')
    default:
      return join(home, '.config', 'gitfreddo')
  }
}

export function getAppDataDir(): string {
  const override = process.env.GITFREDDO_SETTINGS_DIR?.trim()
  if (override) return override
  return resolveAppDataDir()
}
