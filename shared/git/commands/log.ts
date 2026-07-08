import { defineCommand } from './_types'

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

function logGraphFormat(): string {
  return [
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
}

export interface LogGraphParams {
  maxCount: number
}

/** Git log args for graph view — one record per commit. */
export function buildLogGraphArgs(maxCount: number): string[] {
  return [
    'log',
    '--all',
    `--max-count=${maxCount}`,
    `--format=${logGraphFormat()}${LOG_RECORD_SEPARATOR}`,
    '--shortstat',
    '--show-notes',
    '--topo-order'
  ]
}

export interface LogFileParams {
  maxCount: number
  path: string
}

export function buildLogFileArgs({ maxCount, path }: LogFileParams): string[] {
  return [...buildLogGraphArgs(maxCount), '--follow', '--', path]
}

export interface LogPickaxeParams {
  maxCount: number
  query: string
  mode: 'pickaxe' | 'regex'
}

export function buildLogPickaxeArgs({ maxCount, query, mode }: LogPickaxeParams): string[] {
  const args = buildLogGraphArgs(maxCount)
  if (mode === 'regex') {
    args.push('-G', query)
  } else {
    args.push('-S', query)
  }
  return args
}

export interface LogSearchParams {
  maxCount: number
  author?: string
  grep?: string
  since?: string
  until?: string
}

export function buildLogSearchArgs(params: LogSearchParams): string[] {
  const args = buildLogGraphArgs(params.maxCount)
  if (params.author?.trim()) args.push(`--author=${params.author.trim()}`)
  if (params.grep?.trim()) args.push(`--grep=${params.grep.trim()}`, '-i')
  if (params.since?.trim()) args.push(`--since=${params.since.trim()}`)
  if (params.until?.trim()) args.push(`--until=${params.until.trim()}`)
  return args
}

export interface LogMessageParams {
  hash: string
}

export function buildLogMessageArgs({ hash }: LogMessageParams): string[] {
  return ['log', '-1', '--format=%B', hash]
}

export interface LogShowParams {
  ref: string
  path?: string
}

export function buildLogShowArgs({ ref, path }: LogShowParams): string[] {
  const args = ['show', '-m', '--first-parent', ref, '--']
  if (path) args.push(path)
  return args
}

/** Merge commits: combined diff omitted; returns name-status only. */
export function buildShowCommitNameStatusArgs(hash: string): string[] {
  return ['show', '-m', '--first-parent', '--format=', '--name-status', hash]
}

export interface LogTreeParams {
  hash: string
}

/** All file paths at a commit (blobs and trees, recursive). */
export function buildLogTreeArgs({ hash }: LogTreeParams): string[] {
  return ['ls-tree', '-r', '--name-only', hash]
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

export const logGraph = defineCommand({
  id: 'log.graph',
  subcommand: 'log',
  buildArgs: (maxCount: number) => buildLogGraphArgs(maxCount)
})

export const logMessage = defineCommand({
  id: 'log.message',
  subcommand: 'log',
  buildArgs: buildLogMessageArgs
})

export const logTree = defineCommand({
  id: 'log.tree',
  subcommand: 'ls-tree',
  buildArgs: buildLogTreeArgs
})

export const logShow = defineCommand({
  id: 'log.show',
  subcommand: 'show',
  buildArgs: buildLogShowArgs
})

export const logFile = defineCommand({
  id: 'log.file',
  subcommand: 'log',
  buildArgs: buildLogFileArgs
})

export const logPickaxe = defineCommand({
  id: 'log.pickaxe',
  subcommand: 'log',
  buildArgs: buildLogPickaxeArgs
})

export const logSearch = defineCommand({
  id: 'log.search',
  subcommand: 'log',
  buildArgs: buildLogSearchArgs
})
