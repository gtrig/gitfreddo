import { runGit, runGitOrThrow } from '../git-runner'
import { workingStatus } from './status'

export type UndoResetMode = 'soft' | 'mixed' | 'hard'

export interface HeadReflogEntry {
  hash: string
  subject: string
}

export interface UndoPeekResult {
  canUndo: boolean
  targetHash?: string
  targetShortHash?: string
  subject?: string
  mode?: UndoResetMode
  reason?: 'nothing-to-undo' | 'unsupported-action' | 'git-busy'
}

export interface UndoResult {
  targetHash: string
  targetShortHash: string
  subject: string
  mode: UndoResetMode
}

export function pickUndoResetMode(currentSubject: string): UndoResetMode | null {
  const subject = currentSubject.trim()
  if (/^commit(\s|\(|:)/i.test(subject)) return 'soft'
  if (/^reset:/i.test(subject)) return 'mixed'
  if (/^pull:/i.test(subject)) return 'mixed'
  if (/^merge:/i.test(subject)) return 'mixed'
  if (/^cherry-pick:/i.test(subject)) return 'soft'
  return null
}

export function analyzeUndoFromReflog(entries: HeadReflogEntry[]): UndoPeekResult {
  const current = entries[0]
  const previous = entries[1]
  if (!current) {
    return { canUndo: false, reason: 'nothing-to-undo' }
  }
  if (!previous) {
    return { canUndo: false, reason: 'nothing-to-undo' }
  }

  const mode = pickUndoResetMode(current.subject)
  if (!mode) {
    return {
      canUndo: false,
      reason: 'unsupported-action',
      subject: current.subject
    }
  }

  return {
    canUndo: true,
    targetHash: previous.hash,
    targetShortHash: previous.hash.slice(0, 7),
    subject: current.subject,
    mode
  }
}

export async function readHeadReflog(
  cwd: string,
  gitBinaryPath: string,
  count = 2
): Promise<HeadReflogEntry[]> {
  const stdout = await runGitOrThrow(
    ['reflog', 'show', 'HEAD', `-${count}`, '--format=%H%x00%gs'],
    { cwd, gitBinaryPath }
  )

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, subject = ''] = line.split('\0')
      return { hash: hash!, subject }
    })
    .filter((entry) => Boolean(entry.hash))
}

export async function peekUndoAction(cwd: string, gitBinaryPath: string): Promise<UndoPeekResult> {
  const ws = await workingStatus(cwd, gitBinaryPath)
  if (ws.rebaseInProgress || ws.mergeInProgress || ws.cherryPickInProgress) {
    return { canUndo: false, reason: 'git-busy' }
  }

  const entries = await readHeadReflog(cwd, gitBinaryPath, 2)
  return analyzeUndoFromReflog(entries)
}

export async function undoLastAction(cwd: string, gitBinaryPath: string): Promise<UndoResult> {
  const peek = await peekUndoAction(cwd, gitBinaryPath)
  if (!peek.canUndo || !peek.targetHash || !peek.mode || !peek.subject) {
    if (peek.reason === 'git-busy') {
      throw new Error('Finish or abort the current git operation before undoing.')
    }
    if (peek.reason === 'unsupported-action') {
      throw new Error(`Cannot undo: ${peek.subject ?? 'unsupported action'}.`)
    }
    throw new Error('Nothing to undo.')
  }

  await runGitOrThrow(['reset', `--${peek.mode}`, peek.targetHash], { cwd, gitBinaryPath })

  const headMoved = (
    await runGit(['rev-parse', 'HEAD'], { cwd, gitBinaryPath })
  ).stdout.trim()
  if (headMoved !== peek.targetHash) {
    throw new Error('Undo did not move HEAD to the expected commit.')
  }

  return {
    targetHash: peek.targetHash,
    targetShortHash: peek.targetShortHash ?? peek.targetHash.slice(0, 7),
    subject: peek.subject,
    mode: peek.mode
  }
}
