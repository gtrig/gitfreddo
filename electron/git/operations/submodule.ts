import { existsSync } from 'fs'
import { resolve } from 'path'
import {
  parseGitmodulesConfig,
  parseSubmoduleStatusLine,
  submoduleStatusFromPrefix,
  type GitSubmoduleEntry
} from '../../../shared/submodule'
import { runGit, runGitOrThrow } from '../git-runner'

export async function submoduleList(
  cwd: string,
  gitBinaryPath: string
): Promise<GitSubmoduleEntry[]> {
  const gitmodulesPath = resolve(cwd, '.gitmodules')
  if (!existsSync(gitmodulesPath)) {
    return []
  }

  let configStdout = ''
  try {
    configStdout = await runGitOrThrow(['config', '--file', '.gitmodules', '--list'], {
      cwd,
      gitBinaryPath
    })
  } catch {
    return []
  }

  const configs = parseGitmodulesConfig(configStdout)
  if (configs.length === 0) return []

  const statusByPath = new Map<string, ReturnType<typeof parseSubmoduleStatusLine>>()
  try {
    const statusStdout = await runGitOrThrow(['submodule', 'status', '--recursive'], {
      cwd,
      gitBinaryPath
    })
    for (const line of statusStdout.split('\n')) {
      const parsed = parseSubmoduleStatusLine(line)
      if (parsed) statusByPath.set(parsed.path, parsed)
    }
  } catch {
    // keep config-only entries
  }

  const indexByPath = new Map<string, string>()
  try {
    const lsStdout = await runGitOrThrow(['ls-files', '-s'], { cwd, gitBinaryPath })
    for (const line of lsStdout.split('\n')) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 4 || parts[0] !== '160000') continue
      const path = parts.slice(3).join(' ')
      indexByPath.set(path, parts[1] ?? '')
    }
  } catch {
    // ignore
  }

  return configs.map((config) => {
    const statusLine = statusByPath.get(config.path)
    const expectedSha = indexByPath.get(config.path)
    const absolutePath = resolve(cwd, config.path)
    return {
      path: config.path,
      name: config.name,
      url: config.url,
      branch: config.branch,
      commitSha: statusLine?.sha,
      expectedSha,
      status: statusLine ? submoduleStatusFromPrefix(statusLine.prefix) : 'uninitialized',
      hasWorkingTree: existsSync(absolutePath)
    }
  })
}

export async function submoduleAdd(
  cwd: string,
  gitBinaryPath: string,
  params: { url: string; path: string; branch?: string }
): Promise<void> {
  const args = ['-c', 'protocol.file.allow=always', 'submodule', 'add']
  if (params.branch?.trim()) {
    args.push('-b', params.branch.trim())
  }
  args.push(params.url.trim(), params.path.trim())
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function submoduleInit(
  cwd: string,
  gitBinaryPath: string,
  paths?: string[],
  recursive = false
): Promise<void> {
  const args = ['submodule', 'init']
  if (recursive) args.push('--recursive')
  if (paths && paths.length > 0) args.push('--', ...paths)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function submoduleUpdate(
  cwd: string,
  gitBinaryPath: string,
  params: {
    paths?: string[]
    init?: boolean
    recursive?: boolean
    remote?: boolean
    merge?: boolean
    rebase?: boolean
  } = {}
): Promise<void> {
  const args = ['-c', 'protocol.file.allow=always', 'submodule', 'update']
  if (params.init) args.push('--init')
  if (params.recursive) args.push('--recursive')
  if (params.remote) args.push('--remote')
  if (params.merge) args.push('--merge')
  if (params.rebase) args.push('--rebase')
  if (params.paths && params.paths.length > 0) args.push('--', ...params.paths)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function submoduleSync(
  cwd: string,
  gitBinaryPath: string,
  paths?: string[],
  recursive = false
): Promise<void> {
  const args = ['submodule', 'sync']
  if (recursive) args.push('--recursive')
  if (paths && paths.length > 0) args.push('--', ...paths)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function submoduleDeinit(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  force = false
): Promise<void> {
  const args = ['submodule', 'deinit']
  if (force) args.push('-f')
  args.push('--', path)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function submoduleRemove(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  force = false
): Promise<void> {
  try {
    await submoduleDeinit(cwd, gitBinaryPath, path, force)
  } catch {
    if (!force) throw new Error(`Failed to deinitialize submodule at ${path}`)
  }
  await runGitOrThrow(['rm', '-f', '--', path], { cwd, gitBinaryPath })
}

export async function submoduleSetUrl(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  url: string
): Promise<void> {
  await runGitOrThrow(['submodule', 'set-url', '--', path, url], { cwd, gitBinaryPath })
}

export async function isSubmodulePath(
  cwd: string,
  gitBinaryPath: string,
  path: string
): Promise<boolean> {
  const result = await runGit(['ls-files', '-s', '--', path], { cwd, gitBinaryPath })
  if (result.code !== 0) return false
  const mode = result.stdout.trim().split(/\s+/)[0]
  return mode === '160000'
}
