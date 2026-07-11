import type { AppSettings } from '../../../shared/ipc'

/** Allows domain IPC modules to read and write the shared settings state. */
export interface SettingsRef {
  get(): AppSettings
  set(next: AppSettings): void
}
