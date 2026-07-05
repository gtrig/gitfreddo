export const LOG_RECORD_SEPARATOR = '\x1e'
const LOG_FIELD_SEPARATOR = '\x1f'
const LOG_FIELD_COUNT = 13

export interface GitCommitStats {
  filesChanged: number
  insertions: number
  deletions: number
}

export interface ParsedGitCommit {
  hash: string
  shortHash: string
  parents: string[]
  subject: string
  message: string
  body: string
  author: { name: string; email: string; date: string }
  committer: { name: string; email: string; date: string }
  signature: string | null
  notes: string
  stats: GitCommitStats | null
  refs: string[]
}

const SHORTSTAT_RE =
  /^(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/

function parseShortstatFromBlock(block: string): { main: string; stats: GitCommitStats | null } {
  const lines = block.split('\n')

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim() ?? ''
    const match = line.match(SHORTSTAT_RE)
    if (!match) continue

    const main = [...lines.slice(0, index), ...lines.slice(index + 1)].join('\n').trim()
    return {
      main,
      stats: {
        filesChanged: Number.parseInt(match[1] ?? '0', 10),
        insertions: Number.parseInt(match[2] ?? '0', 10),
        deletions: Number.parseInt(match[3] ?? '0', 10)
      }
    }
  }

  return { main: block.trim(), stats: null }
}

/** Git log args for graph view — one record per commit. */
export function buildLogGraphArgs(maxCount: number): string[] {
  const format = [
    '%H',
    '%P',
    '%s',
    '%an',
    '%ae',
    '%aI',
    '%cn',
    '%ce',
    '%cI',
    '%G?',
    '%N',
    '%b',
    '%D'
  ].join(LOG_FIELD_SEPARATOR)

  return [
    'log',
    '--all',
    `--max-count=${maxCount}`,
    `--format=${format}${LOG_RECORD_SEPARATOR}`,
    '--shortstat',
    '--show-notes',
    '--topo-order'
  ]
}

function parseLogRecord(block: string): ParsedGitCommit | null {
  const { main, stats } = parseShortstatFromBlock(block)
  const parts = main.split(LOG_FIELD_SEPARATOR)
  if (parts.length < LOG_FIELD_COUNT) return null

  const [
    hash,
    parentsRaw,
    subject,
    authorName,
    authorEmail,
    authorDate,
    committerName,
    committerEmail,
    committerDate,
    signatureRaw,
    notesRaw,
    bodyRaw,
    refsRaw
  ] = parts

  if (!hash?.trim()) return null

  const parents = parentsRaw.trim() ? parentsRaw.trim().split(' ') : []
  const refs = refsRaw
    .trim()
    .split(',')
    .map((ref) => ref.trim())
    .filter(Boolean)
  const trimmedSubject = subject.trim()
  const body = bodyRaw.trim()
  const message = body ? `${trimmedSubject}\n\n${body}` : trimmedSubject
  const signature = signatureRaw?.trim() || null

  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject: trimmedSubject,
    message,
    body,
    author: { name: authorName, email: authorEmail, date: authorDate },
    committer: { name: committerName, email: committerEmail, date: committerDate },
    signature: signature === 'N' ? null : signature,
    notes: notesRaw.trim(),
    stats,
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
