import { chmod, mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { runGit, runGitOrThrow } from '../git-runner'
import { workingStatus } from './status'

export function markCommitForReword(todoContent: string, fullHash: string): string {
  const normalized = fullHash.toLowerCase()
  return todoContent
    .split('\n')
    .map((line) => {
      const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\s+([0-9a-f]+)/i)
      if (!match) return line
      const lineHash = match[2]!.toLowerCase()
      if (normalized.startsWith(lineHash) || lineHash.startsWith(normalized.slice(0, lineHash.length))) {
        return line.replace(/^(pick|edit|squash|fixup)\s/i, 'reword ')
      }
      return line
    })
    .join('\n')
}

export async function rebaseStart(
  cwd: string,
  gitBinaryPath: string,
  onto: string
): Promise<void> {
  await runGitOrThrow(['rebase', onto], { cwd, gitBinaryPath })
}

export async function rebaseAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['rebase', '--abort'], { cwd, gitBinaryPath })
}

export async function rebaseContinue(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['rebase', '--continue'], { cwd, gitBinaryPath })
}

export async function rebaseReword(
  cwd: string,
  gitBinaryPath: string,
  hash: string,
  message: string
): Promise<void> {
  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    throw new Error('Commit message cannot be empty.')
  }

  const ws = await workingStatus(cwd, gitBinaryPath)
  if (!ws.isClean) {
    throw new Error('Working tree must be clean before rewording a commit.')
  }
  if (ws.rebaseInProgress || ws.mergeInProgress || ws.cherryPickInProgress) {
    throw new Error('Finish or abort the current git operation before rewording a commit.')
  }

  const fullHash = (
    await runGitOrThrow(['rev-parse', '--verify', hash], { cwd, gitBinaryPath })
  ).trim()

  const ancestorCheck = await runGit(['merge-base', '--is-ancestor', fullHash, 'HEAD'], {
    cwd,
    gitBinaryPath
  })
  if (ancestorCheck.code !== 0) {
    throw new Error('Commit is not part of the current branch history.')
  }

  const parentLine = (
    await runGitOrThrow(['rev-list', '--parents', '-n', '1', fullHash], { cwd, gitBinaryPath })
  ).trim()
  const parentCount = parentLine.split(/\s+/).length - 1
  if (parentCount > 1) {
    throw new Error('Rewording merge commits is not supported.')
  }

  const isRoot =
    (await runGit(['rev-parse', '--verify', `${fullHash}^`], { cwd, gitBinaryPath })).code !== 0

  const tempDir = await mkdtemp(join(tmpdir(), 'gitfredo-reword-'))
  try {
    const messageFile = join(tempDir, 'message')
    const seqEditor = join(tempDir, 'seq-editor.mjs')
    const msgEditor = join(tempDir, 'msg-editor.mjs')

    await writeFile(messageFile, trimmedMessage, 'utf8')
    await writeFile(
      seqEditor,
      `import { readFileSync, writeFileSync } from 'fs'
const todoPath = process.argv[2]
const fullHash = ${JSON.stringify(fullHash.toLowerCase())}
const updated = readFileSync(todoPath, 'utf8')
  .split('\\n')
  .map((line) => {
    const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\\s+([0-9a-f]+)/i)
    if (!match) return line
    const lineHash = match[2].toLowerCase()
    if (fullHash.startsWith(lineHash) || lineHash.startsWith(fullHash.slice(0, lineHash.length))) {
      return line.replace(/^(pick|edit|squash|fixup)\\s/i, 'reword ')
    }
    return line
  })
  .join('\\n')
writeFileSync(todoPath, updated)
`,
      'utf8'
    )
    await writeFile(
      msgEditor,
      `import { copyFileSync } from 'fs'
copyFileSync(${JSON.stringify(messageFile)}, process.argv[2])
`,
      'utf8'
    )
    await chmod(seqEditor, 0o755)
    await chmod(msgEditor, 0o755)

    const nodeBin = process.execPath
    const rebaseArgs = isRoot ? ['rebase', '-i', '--root'] : ['rebase', '-i', `${fullHash}^`]

    await runGitOrThrow(rebaseArgs, {
      cwd,
      gitBinaryPath,
      env: {
        GIT_SEQUENCE_EDITOR: `${nodeBin} ${seqEditor}`,
        GIT_EDITOR: `${nodeBin} ${msgEditor}`,
        GIT_TERMINAL_PROMPT: '0'
      }
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function cherryPick(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<void> {
  await runGitOrThrow(['cherry-pick', hash], { cwd, gitBinaryPath })
}

export async function resetRepo(
  cwd: string,
  gitBinaryPath: string,
  mode: 'soft' | 'mixed' | 'hard',
  ref?: string
): Promise<void> {
  const args = ['reset', `--${mode}`]
  if (ref) args.push(ref)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}
