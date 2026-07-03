import { homedir } from 'os'
import { posix, win32 } from 'path'

function joinForPlatform(platform: NodeJS.Platform, ...segments: string[]): string {
  return (platform === 'win32' ? win32 : posix).join(...segments)
}

export function resolveAppDataDir(
  platform: NodeJS.Platform = process.platform,
  home: string = homedir()
): string {
  switch (platform) {
    case 'darwin':
      return joinForPlatform(platform, home, 'Library', 'Application Support', 'gitfreddo')
    case 'win32': {
      const roaming =
        platform === process.platform && home === homedir() && process.env.APPDATA
          ? process.env.APPDATA
          : joinForPlatform(platform, home, 'AppData', 'Roaming')
      return joinForPlatform(platform, roaming, 'gitfreddo')
    }
    default:
      return joinForPlatform(platform, home, '.config', 'gitfreddo')
  }
}

export function getAppDataDir(): string {
  const override = process.env.GITFREDDO_SETTINGS_DIR?.trim()
  if (override) return override
  return resolveAppDataDir()
}
