export type SubmoduleEntryStatus =
  | 'initialized'
  | 'uninitialized'
  | 'dirty'
  | 'ahead'
  | 'behind'

export type SubmoduleRecursion = 'none' | 'on-demand' | 'always'
export type PushSubmoduleRecursion = 'no' | 'check' | 'on-demand'

export interface GitSubmoduleEntry {
  path: string
  name: string
  url: string
  branch?: string
  commitSha?: string
  expectedSha?: string
  status: SubmoduleEntryStatus
  hasWorkingTree: boolean
}


export function submoduleRecursionCloneArgs(mode: SubmoduleRecursion): string[] {
  if (mode === 'always') return ['--recurse-submodules', '--jobs', '8']
  if (mode === 'on-demand') return ['--recurse-submodules=on-demand']
  return []
}

export function submoduleRecursionFetchArgs(mode: SubmoduleRecursion): string[] {
  if (mode === 'always') return ['--recurse-submodules']
  if (mode === 'on-demand') return ['--recurse-submodules=on-demand']
  return []
}

export function pushSubmoduleRecursionArgs(mode: PushSubmoduleRecursion): string[] {
  if (mode === 'check') return ['--recurse-submodules=check']
  if (mode === 'on-demand') return ['--recurse-submodules=on-demand']
  return []
}

export interface ParsedSubmoduleConfig {
  name: string
  path: string
  url: string
  branch?: string
}

export interface ParsedSubmoduleStatusLine {
  prefix: string
  sha: string
  path: string
  label?: string
}

export function parseGitmodulesConfig(stdout: string): ParsedSubmoduleConfig[] {
  const byName = new Map<string, Partial<ParsedSubmoduleConfig>>()

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^submodule\.([^.]+)\.(path|url|branch)=(.*)$/)
    if (!match) continue
    const [, name, key, value] = match
    const entry = byName.get(name) ?? { name }
    if (key === 'path') entry.path = value
    if (key === 'url') entry.url = value
    if (key === 'branch') entry.branch = value
    byName.set(name, entry)
  }

  return [...byName.values()].filter(
    (entry): entry is ParsedSubmoduleConfig => Boolean(entry.name && entry.path && entry.url)
  )
}

export function parseSubmoduleStatusLine(line: string): ParsedSubmoduleStatusLine | null {
  const trimmed = line.trimEnd()
  if (!trimmed) return null
  const match = trimmed.match(/^([ +\-U]*)([0-9a-f]{7,40})\s+(\S+)(?:\s+\(([^)]+)\))?$/)
  if (!match) return null
  return {
    prefix: match[1] ?? '',
    sha: match[2] ?? '',
    path: match[3] ?? '',
    label: match[4]
  }
}

export function submoduleStatusFromPrefix(prefix: string): SubmoduleEntryStatus {
  if (prefix.includes('-')) return 'uninitialized'
  if (prefix.includes('U')) return 'dirty'
  if (prefix.includes('+')) return 'ahead'
  return 'initialized'
}
