const docModules = import.meta.glob<string>('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const changelogModules = import.meta.glob<string>('../../CHANGELOG.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

function normalizeDocKey(key: string): string | null {
  const docsMatch = key.match(/docs\/(.+\.md)$/)
  if (docsMatch) return docsMatch[1]
  if (key.endsWith('/CHANGELOG.md') || key.endsWith('CHANGELOG.md')) return 'CHANGELOG.md'
  return null
}

const docsByPath = new Map<string, string>()

for (const [key, content] of Object.entries({ ...docModules, ...changelogModules })) {
  const path = normalizeDocKey(key)
  if (path) docsByPath.set(path, content)
}

export function getDocContent(path: string): string | null {
  return docsByPath.get(path) ?? null
}

export function getDocTitle(path: string): string {
  const content = getDocContent(path)
  if (!content) return path

  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()

  const fileName = path.split('/').pop() ?? path
  return fileName.replace(/\.md$/, '').replace(/[-_]/g, ' ')
}
