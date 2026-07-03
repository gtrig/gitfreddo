export function resolveDocLink(fromPath: string, href: string): string | null {
  if (!href || href.startsWith('#')) return null
  if (/^[a-z]+:/i.test(href)) return null

  const [pathPart] = href.split('#')
  if (!pathPart.endsWith('.md')) return null

  if (pathPart.startsWith('/')) {
    return pathPart.slice(1)
  }

  const fromDir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : ''
  const segments = [...(fromDir ? fromDir.split('/') : []), ...pathPart.split('/')]
  const resolved: string[] = []

  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }

  return resolved.join('/')
}
