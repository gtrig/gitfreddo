import {
  buildNotesAddArgs,
  buildNotesListArgs,
  buildNotesShowArgs
} from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'

export interface GitNote {
  hash: string
  note: string
}

export async function notesList(
  cwd: string,
  gitBinaryPath: string,
  commitHash?: string
): Promise<GitNote[]> {
  if (commitHash?.trim()) {
    try {
      const note = await runGitOrThrow(buildNotesShowArgs(commitHash.trim()), {
        cwd,
        gitBinaryPath
      })
      return [{ hash: commitHash.trim(), note: note.trim() }]
    } catch {
      return []
    }
  }

  const stdout = await runGitOrThrow(buildNotesListArgs(), { cwd, gitBinaryPath })
  const notes: GitNote[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s+/)
    const objectHash = parts[1]
    if (!objectHash) continue
    try {
      const note = await runGitOrThrow(buildNotesShowArgs(objectHash), { cwd, gitBinaryPath })
      notes.push({ hash: objectHash, note: note.trim() })
    } catch {
      notes.push({ hash: objectHash, note: '(unreadable note)' })
    }
  }
  return notes
}

export async function notesAdd(
  cwd: string,
  gitBinaryPath: string,
  commitHash: string,
  message: string,
  options: { force?: boolean } = {}
): Promise<void> {
  await runGitOrThrow(
    buildNotesAddArgs({ hash: commitHash, message, force: options.force }),
    { cwd, gitBinaryPath }
  )
}
