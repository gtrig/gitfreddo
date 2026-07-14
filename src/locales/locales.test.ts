import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import en from './en.json'
import el from './el.json'

function flattenStrings(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenStrings(value as Record<string, unknown>, path))
    } else if (typeof value === 'string') {
      out[path] = value
    }
  }
  return out
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'out' || entry === 'dist') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkFiles(full, out)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

const STATIC_KEY_RE =
  /(?:\bt\s*\(\s*|menuLabel\s*\([^,]+,\s*)(['"`])([a-zA-Z][a-zA-Z0-9_.]*)\1/g

/** Prefixes used via template literals like `${i18nPrefix}.pr.createTitle`. */
const DYNAMIC_PREFIXES = [
  'github.pr.',
  'gitlab.pr.',
  'bitbucket.pr.',
  'github.repoPicker.',
  'gitlab.repoPicker.',
  'bitbucket.repoPicker.',
  'github.issue.',
  'gitlab.issue.',
  'bitbucket.issue.',
  'github.fork.',
  'gitlab.fork.',
  'bitbucket.fork.',
  'github.repo.',
  'gitlab.repo.',
  'bitbucket.repo.',
  'contextMenu.sidebar.',
  'contextMenu.detailPanel.',
  'sidebar.issues.',
  'sidebar.pullRequests.'
]

function collectReferencedKeys(roots: string[]): Set<string> {
  const keys = new Set<string>()
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(STATIC_KEY_RE)) {
        keys.add(match[2]!)
      }
    }
  }
  return keys
}

function isCoveredByDynamicPrefix(key: string): boolean {
  return DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix))
}

describe('locale catalogs', () => {
  const enFlat = flattenStrings(en)
  const elFlat = flattenStrings(el)
  const repoRoot = join(__dirname, '../..')

  it('el.json contains every en.json key', () => {
    const missing = Object.keys(enFlat).filter((key) => !(key in elFlat))
    expect(missing).toEqual([])
  })

  it('en.json contains every el.json key', () => {
    const missing = Object.keys(elFlat).filter((key) => !(key in enFlat))
    expect(missing).toEqual([])
  })

  it('reports unused en.json keys within a soft budget', () => {
    const referenced = collectReferencedKeys([join(repoRoot, 'src'), join(repoRoot, 'electron')])
    const unused = Object.keys(enFlat).filter(
      (key) => !referenced.has(key) && !isCoveredByDynamicPrefix(key)
    )

    // Soft gate: keep unused-key drift bounded until catalogs are aggressively trimmed.
    expect(unused.length).toBeLessThan(400)
  })
})
