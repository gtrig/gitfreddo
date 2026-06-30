export const LOG_RECORD_SEPARATOR = '\x1e'
const LOG_FIELD_SEPARATOR = '\x1f'

export interface ParsedGitCommit {
  hash: string
  shortHash: string
  parents: string[]
  subject: string
  message: string
  author: { name: string; email: string; date: string }
  refs: string[]
}

/** Git log args for graph view — one record per commit (no multiline %B). */
export function buildLogGraphArgs(maxCount: number): string[] {
  const format = [
    '%H',
    '%P',
    '%s',
    '%an',
    '%ae',
    '%aI',
    '%D'
  ].join(LOG_FIELD_SEPARATOR)

  return ['log', `--max-count=${maxCount}`, `--format=${format}${LOG_RECORD_SEPARATOR}`, '--date-order']
}

function parseLogRecord(block: string): ParsedGitCommit | null {
  const parts = block.split(LOG_FIELD_SEPARATOR)
  if (parts.length < 7) return null

  const [hash, parentsRaw, subject, authorName, authorEmail, authorDate, refsRaw] = parts
  if (!hash?.trim()) return null

  const parents = parentsRaw.trim() ? parentsRaw.trim().split(' ') : []
  const refs = refsRaw
    .trim()
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.replace(/^tag: /, ''))

  const trimmedSubject = subject.trim()

  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject: trimmedSubject,
    message: trimmedSubject,
    author: { name: authorName, email: authorEmail, date: authorDate },
    refs
  }
}

export function parseLogGraphOutput(stdout: string): ParsedGitCommit[] {
  return stdout
    .split(LOG_RECORD_SEPARATOR)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(parseLogRecord)
    .filter((commit): commit is ParsedGitCommit => commit !== null)
}
