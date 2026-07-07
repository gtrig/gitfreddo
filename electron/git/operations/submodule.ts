import { existsSync } from 'fs'
import { resolve } from 'path'
import {
  buildGitmodulesConfigArgs,
  buildLsFilesArgs,
  buildLsFilesMatchArgs,
  buildRmArgs,
  buildSubmoduleAddArgs,
  buildSubmoduleDeinitArgs,
  buildSubmoduleInitArgs,
  buildSubmoduleSetUrlArgs,
  buildSubmoduleStatusArgs,
  buildSubmoduleSyncArgs,
  buildSubmoduleUpdateArgs
} from '../../../shared/git/commands'
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
    configStdout = await runGitOrThrow(buildGitmodulesConfigArgs(), { cwd, gitBinaryPath })
  } catch {
    return []
  }

  const configs = parseGitmodulesConfig(configStdout)
  if (configs.length === 0) return []

  const statusByPath = new Map<string, ReturnType<typeof parseSubmoduleStatusLine>>()
  try {
    const statusStdout = await runGitOrThrow(buildSubmoduleStatusArgs(), { cwd, gitBinaryPath })
    for (const line of statusStdout.split('\n')) {
      const parsed = parseSubmoduleStatusLine(line)
      if (parsed) statusByPath.set(parsed.path, parsed)
    }
  } catch {
    // keep config-only entries
  }

  const indexByPath = new Map<string, string>()
  try {
    const lsStdout = await runGitOrThrow(buildLsFilesArgs(), { cwd, gitBinaryPath })
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
  await runGitOrThrow(
    buildSubmoduleAddArgs({
      url: params.url.trim(),
      path: params.path.trim(),
      branch: params.branch
    }),
    { cwd, gitBinaryPath }
  )
}

export async function submoduleInit(
  cwd: string,
  gitBinaryPath: string,
  paths?: string[],
  recursive = false
): Promise<void> {
  await runGitOrThrow(buildSubmoduleInitArgs({ paths, recursive }), { cwd, gitBinaryPath })
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
  await runGitOrThrow(buildSubmoduleUpdateArgs(params), { cwd, gitBinaryPath })
}

export async function submoduleSync(
  cwd: string,
  gitBinaryPath: string,
  paths?: string[],
  recursive = false
): Promise<void> {
  await runGitOrThrow(buildSubmoduleSyncArgs({ paths, recursive }), { cwd, gitBinaryPath })
}

export async function submoduleDeinit(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  force = false
): Promise<void> {
  await runGitOrThrow(buildSubmoduleDeinitArgs({ path, force }), { cwd, gitBinaryPath })
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
  await runGitOrThrow(buildRmArgs({ paths: [path], force: true }), { cwd, gitBinaryPath })
}

export async function submoduleSetUrl(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  url: string
): Promise<void> {
  await runGitOrThrow(buildSubmoduleSetUrlArgs({ path, url }), { cwd, gitBinaryPath })
}

export async function isSubmodulePath(
  cwd: string,
  gitBinaryPath: string,
  path: string
): Promise<boolean> {
  const result = await runGit(buildLsFilesMatchArgs({ path }), { cwd, gitBinaryPath })
  if (result.code !== 0) return false
  const mode = result.stdout.trim().split(/\s+/)[0]
  return mode === '160000'
}
