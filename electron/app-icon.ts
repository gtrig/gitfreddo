import { app, nativeImage, type NativeImage } from 'electron'
import { join } from 'path'

function assetsDir(): string {
  return app.isPackaged ? join(app.getAppPath(), 'assets') : join(__dirname, '../../assets')
}

function iconPath(): string {
  return join(assetsDir(), 'logo.png')
}

export function loadAppIcon(): NativeImage | undefined {
  const image = nativeImage.createFromPath(iconPath())
  return image.isEmpty() ? undefined : image
}
