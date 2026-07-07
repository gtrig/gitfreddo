import { chmod, mkdtemp, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildCherryPickAbortArgs,
  buildCherryPickArgs,
  buildCherryPickContinueArgs,
  buildCherryPickSkipArgs,
  buildMergeBaseIsAncestorArgs,
  buildRebaseAbortArgs,
  buildRebaseContinueArgs,
  buildRebaseInteractiveArgs,
  buildRebaseSkipArgs,
  buildRebaseStartArgs,
  buildResetHeadParentArgs,
  buildResetModeArgs,
  buildRevertArgs,
  buildRevListParentsArgs,
  buildRevParseHeadParentArgs,
  buildRevParseParentArgs,
  buildRevParseVerifyArgs
} from '../../../shared/git/commands'
import { runGit, runGitOrThrow } from '../git-runner'
import { workingStatus } from './status'
import { continueGitOperation } from './commit-message'

/** Lets process.execPath run .mjs git editor scripts when the app is Electron. */
function electronNodeEnv(): NodeJS.ProcessEnv {
  return process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}
}

function gitRebaseEditorEnv(
  sequenceEditorPath: string,
  messageEditorPath?: string
): NodeJS.ProcessEnv {
  const nodeBin = process.execPath
  const env: NodeJS.ProcessEnv = {
    ...electronNodeEnv(),
    GIT_SEQUENCE_EDITOR: `${nodeBin} ${sequenceEditorPath}`,
    GIT_TERMINAL_PROMPT: '0'
  }
  env.GIT_EDITOR = messageEditorPath ? `${nodeBin} ${messageEditorPath}` : 'true'
  return env
}

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

function hashMatchesLine(lineHash: string, targetHash: string): boolean {
  const normalized = targetHash.toLowerCase()
  return normalized.startsWith(lineHash) || lineHash.startsWith(normalized.slice(0, lineHash.length))
}

/** Marks selected commits as drop in a rebase todo list. */
export function markCommitsForDrop(todoContent: string, hashes: string[]): string {
  if (hashes.length === 0) return todoContent

  const selected = new Set(hashes.map((hash) => hash.toLowerCase()))

  return todoContent
    .split('\n')
    .map((line) => {
      const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\s+([0-9a-f]+)/i)
      if (!match) return line

      const lineHash = match[2]!.toLowerCase()
      const inSelection = [...selected].some((hash) => hashMatchesLine(lineHash, hash))
      if (!inSelection) return line

      return line.replace(/^(pick|reword|edit|squash|fixup)\s/i, 'drop ')
    })
    .join('\n')
}

/** Marks all but the oldest selected commit as squash in a rebase todo list. */
export function markCommitsForSquash(todoContent: string, chronologicalHashes: string[]): string {
  if (chronologicalHashes.length < 2) return todoContent

  const primaryHash = chronologicalHashes[0]!.toLowerCase()
  const selected = new Set(chronologicalHashes.map((hash) => hash.toLowerCase()))

  return todoContent
    .split('\n')
    .map((line) => {
      const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\s+([0-9a-f]+)/i)
      if (!match) return line

      const lineHash = match[2]!.toLowerCase()
      const inSelection = [...selected].some((hash) => hashMatchesLine(lineHash, hash))
      if (!inSelection) return line

      if (hashMatchesLine(lineHash, primaryHash)) {
        return line.replace(/^(reword|edit|squash|fixup|drop)\s/i, 'pick ')
      }

      return line.replace(/^(pick|reword|edit|fixup|drop)\s/i, 'squash ')
    })
    .join('\n')
}

async function assertCanRewriteHistory(cwd: string, gitBinaryPath: string): Promise<void> {
  const ws = await workingStatus(cwd, gitBinaryPath)
  if (!ws.isClean) {
    throw new Error('Working tree must be clean before rewriting history.')
  }
  if (ws.rebaseInProgress || ws.mergeInProgress || ws.cherryPickInProgress) {
    throw new Error('Finish or abort the current git operation first.')
  }
}

async function resolveFullHash(cwd: string, gitBinaryPath: string, hash: string): Promise<string> {
  return (
    await runGitOrThrow(buildRevParseVerifyArgs({ ref: hash }), { cwd, gitBinaryPath })
  ).trim()
}

async function runInteractiveRebaseWithSequenceEditor(
  cwd: string,
  gitBinaryPath: string,
  rebaseArgs: string[],
  seqEditorPath: string
): Promise<void> {
  await runGitOrThrow(rebaseArgs, {
    cwd,
    gitBinaryPath,
    env: gitRebaseEditorEnv(seqEditorPath)
  })
}

export async function rebaseStart(
  cwd: string,
  gitBinaryPath: string,
  onto: string,
  from?: string
): Promise<void> {
  await runGitOrThrow(buildRebaseStartArgs({ onto, from }), { cwd, gitBinaryPath })
}

export async function rebaseAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildRebaseAbortArgs(), { cwd, gitBinaryPath })
}

export async function rebaseContinue(
  cwd: string,
  gitBinaryPath: string,
  message?: string
): Promise<void> {
  await continueGitOperation(cwd, gitBinaryPath, buildRebaseContinueArgs(), message)
}

export async function rebaseSkip(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildRebaseSkipArgs(), { cwd, gitBinaryPath })
}

export async function cherryPickContinue(
  cwd: string,
  gitBinaryPath: string,
  message?: string
): Promise<void> {
  await continueGitOperation(cwd, gitBinaryPath, buildCherryPickContinueArgs(), message)
}

export async function cherryPickAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildCherryPickAbortArgs(), { cwd, gitBinaryPath })
}

export async function cherryPickSkip(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildCherryPickSkipArgs(), { cwd, gitBinaryPath })
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
    await runGitOrThrow(buildRevParseVerifyArgs({ ref: hash }), { cwd, gitBinaryPath })
  ).trim()

  const ancestorCheck = await runGit(
    buildMergeBaseIsAncestorArgs({ ancestor: fullHash, descendant: 'HEAD' }),
    { cwd, gitBinaryPath }
  )
  if (ancestorCheck.code !== 0) {
    throw new Error('Commit is not part of the current branch history.')
  }

  const parentLine = (
    await runGitOrThrow(buildRevListParentsArgs({ hash: fullHash }), { cwd, gitBinaryPath })
  ).trim()
  const parentCount = parentLine.split(/\s+/).length - 1
  if (parentCount > 1) {
    throw new Error('Rewording merge commits is not supported.')
  }

  const isRoot =
    (await runGit(buildRevParseParentArgs(fullHash), { cwd, gitBinaryPath })).code !== 0

  const tempDir = await mkdtemp(join(tmpdir(), 'gitfreddo-reword-'))
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

    const rebaseArgs = isRoot
      ? buildRebaseInteractiveArgs({ root: true })
      : buildRebaseInteractiveArgs({ baseHash: fullHash })

    await runGitOrThrow(rebaseArgs, {
      cwd,
      gitBinaryPath,
      env: gitRebaseEditorEnv(seqEditor, msgEditor)
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function cherryPick(
  cwd: string,
  gitBinaryPath: string,
  hash: string,
  noCommit = false,
  mainline?: number
): Promise<void> {
  const fullHash = await resolveFullHash(cwd, gitBinaryPath, hash)
  const parentCount = await mergeParentCount(cwd, gitBinaryPath, fullHash)
  if (parentCount > 1 && !mainline) {
    throw new Error('Select a parent line when cherry-picking a merge commit.')
  }
  await runGitOrThrow(
    buildCherryPickArgs({
      hash: fullHash,
      noCommit,
      mainline: parentCount > 1 ? mainline : undefined
    }),
    { cwd, gitBinaryPath }
  )
}

export async function cherryPickMultiple(
  cwd: string,
  gitBinaryPath: string,
  hashes: string[],
  noCommit = false,
  mainline?: number
): Promise<void> {
  if (hashes.length === 0) return

  await assertCanRewriteHistory(cwd, gitBinaryPath)

  for (const hash of hashes) {
    await cherryPick(cwd, gitBinaryPath, hash, noCommit, mainline)
  }
}

async function mergeParentCount(
  cwd: string,
  gitBinaryPath: string,
  fullHash: string
): Promise<number> {
  const parentLine = (
    await runGitOrThrow(buildRevListParentsArgs({ hash: fullHash }), { cwd, gitBinaryPath })
  ).trim()
  return parentLine.split(/\s+/).length - 1
}

export async function rebaseSquash(
  cwd: string,
  gitBinaryPath: string,
  hashes: string[]
): Promise<void> {
  if (hashes.length < 2) {
    throw new Error('Select at least two commits to squash.')
  }

  await assertCanRewriteHistory(cwd, gitBinaryPath)

  const resolved = []
  for (const hash of hashes) {
    resolved.push(await resolveFullHash(cwd, gitBinaryPath, hash))
  }

  for (const fullHash of resolved) {
    const parentLine = (
      await runGitOrThrow(buildRevListParentsArgs({ hash: fullHash }), { cwd, gitBinaryPath })
    ).trim()
    if (parentLine.split(/\s+/).length - 1 > 1) {
      throw new Error('Squashing merge commits is not supported.')
    }
  }

  const oldestHash = resolved[0]!
  const isRoot =
    (await runGit(buildRevParseParentArgs(oldestHash), { cwd, gitBinaryPath })).code !== 0

  const tempDir = await mkdtemp(join(tmpdir(), 'gitfreddo-squash-'))
  try {
    const seqEditor = join(tempDir, 'seq-editor.mjs')
    await writeFile(
      seqEditor,
      `import { readFileSync, writeFileSync } from 'fs'
const todoPath = process.argv[2]
const hashes = ${JSON.stringify(resolved.map((hash) => hash.toLowerCase()))}
const primaryHash = ${JSON.stringify(resolved[0]!.toLowerCase())}
const selected = new Set(hashes)
const hashMatches = (lineHash, targetHash) => {
  const normalized = targetHash.toLowerCase()
  return normalized.startsWith(lineHash) || lineHash.startsWith(normalized.slice(0, lineHash.length))
}
const updated = readFileSync(todoPath, 'utf8')
  .split('\\n')
  .map((line) => {
    const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\\s+([0-9a-f]+)/i)
    if (!match) return line
    const lineHash = match[2].toLowerCase()
    const inSelection = hashes.some((hash) => hashMatches(lineHash, hash))
    if (!inSelection) return line
    if (hashMatches(lineHash, primaryHash)) {
      return line.replace(/^(reword|edit|squash|fixup|drop)\\s/i, 'pick ')
    }
    return line.replace(/^(pick|reword|edit|fixup|drop)\\s/i, 'squash ')
  })
  .join('\\n')
writeFileSync(todoPath, updated)
`,
      'utf8'
    )
    await chmod(seqEditor, 0o755)

    const rebaseArgs = isRoot
      ? buildRebaseInteractiveArgs({ root: true })
      : buildRebaseInteractiveArgs({ baseHash: oldestHash })
    await runInteractiveRebaseWithSequenceEditor(cwd, gitBinaryPath, rebaseArgs, seqEditor)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function rebaseInteractive(
  cwd: string,
  gitBinaryPath: string,
  baseHash: string,
  todoLines: string[]
): Promise<void> {
  if (todoLines.length === 0) {
    throw new Error('Rebase todo list cannot be empty.')
  }

  await assertCanRewriteHistory(cwd, gitBinaryPath)

  const fullHash = await resolveFullHash(cwd, gitBinaryPath, baseHash)
  const isRoot =
    (await runGit(buildRevParseParentArgs(fullHash), { cwd, gitBinaryPath })).code !== 0

  const tempDir = await mkdtemp(join(tmpdir(), 'gitfreddo-interactive-'))
  try {
    const seqEditor = join(tempDir, 'seq-editor.mjs')
    await writeFile(
      seqEditor,
      `import { writeFileSync } from 'fs'
writeFileSync(process.argv[2], ${JSON.stringify(todoLines.join('\n'))})
`,
      'utf8'
    )
    await chmod(seqEditor, 0o755)

    const rebaseArgs = isRoot
      ? buildRebaseInteractiveArgs({ root: true })
      : buildRebaseInteractiveArgs({ baseHash: fullHash })
    await runInteractiveRebaseWithSequenceEditor(cwd, gitBinaryPath, rebaseArgs, seqEditor)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function resetRepo(
  cwd: string,
  gitBinaryPath: string,
  mode: 'soft' | 'mixed' | 'hard',
  ref?: string
): Promise<void> {
  await runGitOrThrow(buildResetModeArgs({ mode, ref }), { cwd, gitBinaryPath })
}

export async function resetToParent(
  cwd: string,
  gitBinaryPath: string,
  mode: 'soft' | 'mixed' | 'hard'
): Promise<void> {
  const hasParent =
    (await runGit(buildRevParseHeadParentArgs(), { cwd, gitBinaryPath })).code === 0
  if (!hasParent) {
    throw new Error('Cannot delete the root commit.')
  }

  if (mode === 'hard') {
    await assertCanRewriteHistory(cwd, gitBinaryPath)
  } else {
    const ws = await workingStatus(cwd, gitBinaryPath)
    if (ws.rebaseInProgress || ws.mergeInProgress || ws.cherryPickInProgress) {
      throw new Error('Finish or abort the current git operation first.')
    }
  }

  await runGitOrThrow(buildResetHeadParentArgs(mode), { cwd, gitBinaryPath })
}

export async function revertCommit(
  cwd: string,
  gitBinaryPath: string,
  hash: string,
  mainline?: number
): Promise<void> {
  const ws = await workingStatus(cwd, gitBinaryPath)
  if (ws.rebaseInProgress || ws.mergeInProgress || ws.cherryPickInProgress) {
    throw new Error('Finish or abort the current git operation before reverting a commit.')
  }

  const fullHash = await resolveFullHash(cwd, gitBinaryPath, hash)
  const parentCount = await mergeParentCount(cwd, gitBinaryPath, fullHash)
  if (parentCount > 1 && !mainline) {
    throw new Error('Select a parent line when reverting a merge commit.')
  }
  await runGitOrThrow(
    buildRevertArgs({
      hash: fullHash,
      mainline: parentCount > 1 ? mainline : undefined
    }),
    { cwd, gitBinaryPath }
  )
}

export async function rebaseDrop(
  cwd: string,
  gitBinaryPath: string,
  hashes: string[]
): Promise<void> {
  if (hashes.length === 0) {
    throw new Error('Select at least one commit to drop.')
  }

  await assertCanRewriteHistory(cwd, gitBinaryPath)

  const resolved = []
  for (const hash of hashes) {
    resolved.push(await resolveFullHash(cwd, gitBinaryPath, hash))
  }

  for (const fullHash of resolved) {
    const parentLine = (
      await runGitOrThrow(buildRevListParentsArgs({ hash: fullHash }), { cwd, gitBinaryPath })
    ).trim()
    if (parentLine.split(/\s+/).length - 1 > 1) {
      throw new Error('Dropping merge commits is not supported.')
    }
  }

  const oldestHash = resolved[0]!
  const isRoot =
    (await runGit(buildRevParseParentArgs(oldestHash), { cwd, gitBinaryPath })).code !== 0

  const tempDir = await mkdtemp(join(tmpdir(), 'gitfreddo-drop-'))
  try {
    const seqEditor = join(tempDir, 'seq-editor.mjs')
    await writeFile(
      seqEditor,
      `import { readFileSync, writeFileSync } from 'fs'
const todoPath = process.argv[2]
const hashes = ${JSON.stringify(resolved.map((hash) => hash.toLowerCase()))}
const hashMatches = (lineHash, targetHash) => {
  const normalized = targetHash.toLowerCase()
  return normalized.startsWith(lineHash) || lineHash.startsWith(normalized.slice(0, lineHash.length))
}
const updated = readFileSync(todoPath, 'utf8')
  .split('\\n')
  .map((line) => {
    const match = line.match(/^(pick|reword|edit|squash|fixup|drop)\\s+([0-9a-f]+)/i)
    if (!match) return line
    const lineHash = match[2].toLowerCase()
    const inSelection = hashes.some((hash) => hashMatches(lineHash, hash))
    if (!inSelection) return line
    return line.replace(/^(pick|reword|edit|squash|fixup)\\s/i, 'drop ')
  })
  .join('\\n')
writeFileSync(todoPath, updated)
`,
      'utf8'
    )
    await chmod(seqEditor, 0o755)

    const rebaseArgs = isRoot
      ? buildRebaseInteractiveArgs({ root: true })
      : buildRebaseInteractiveArgs({ baseHash: oldestHash })
    await runInteractiveRebaseWithSequenceEditor(cwd, gitBinaryPath, rebaseArgs, seqEditor)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
