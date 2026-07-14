/**
 * Prefer a stored SSH key title; otherwise discover one from the forge account,
 * persist it, and return it. Discovery failures leave the title empty so the
 * authenticated connection stays intact when SSH scopes are missing.
 */
export async function resolveStoredOrDiscoveredSshKeyTitle<TSettings>(options: {
  settings: TSettings
  stored: string | undefined | null
  discover: () => Promise<string | null>
  persist: (title: string) => Promise<TSettings>
}): Promise<{ settings: TSettings; sshKeyTitle: string }> {
  const trimmed = options.stored?.trim() ?? ''
  if (trimmed) {
    return { settings: options.settings, sshKeyTitle: trimmed }
  }

  try {
    const discovered = await options.discover()
    if (!discovered) {
      return { settings: options.settings, sshKeyTitle: '' }
    }

    const next = await options.persist(discovered)
    return { settings: next, sshKeyTitle: discovered }
  } catch {
    return { settings: options.settings, sshKeyTitle: '' }
  }
}
