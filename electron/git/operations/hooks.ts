import {
  chmodSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { join, resolve } from 'path'
import { resolveGitCommonDir } from '../git-dir'
import { buildRevParseShowToplevelArgs } from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'
import { configGet } from './config'

export interface GitHook {
  name: string
  filename: string
  enabled: boolean
  executable: boolean
}

export interface GitHooksListResult {
  hooks: GitHook[]
  hooksDir: string
}

const HOOK_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const SAMPLE_SUFFIX = '.sample'
const DISABLED_SUFFIX = '.disabled'

function validateHookName(name: string): void {
  if (!HOOK_NAME_RE.test(name)) {
    throw new Error(`Invalid hook name: ${name}`)
  }
  if (name.endsWith(SAMPLE_SUFFIX) || name.endsWith(DISABLED_SUFFIX)) {
    throw new Error(`Invalid hook name: ${name}`)
  }
}

function isExecutable(filePath: string): boolean {
  try {
    const mode = statSync(filePath).mode
    return (mode & 0o111) !== 0
  } catch {
    return false
  }
}

function parseHookFilename(
  filename: string
): { name: string; variant: 'active' | 'sample' | 'disabled' } | null {
  if (filename.endsWith(DISABLED_SUFFIX)) {
    const name = filename.slice(0, -DISABLED_SUFFIX.length)
    if (name && HOOK_NAME_RE.test(name)) return { name, variant: 'disabled' }
    return null
  }
  if (filename.endsWith(SAMPLE_SUFFIX)) {
    const name = filename.slice(0, -SAMPLE_SUFFIX.length)
    if (name && HOOK_NAME_RE.test(name)) return { name, variant: 'sample' }
    return null
  }
  if (HOOK_NAME_RE.test(filename)) {
    return { name: filename, variant: 'active' }
  }
  return null
}

export async function resolveHooksDir(cwd: string, gitBinaryPath: string): Promise<string> {
  const hooksPath =
    (await configGet(cwd, gitBinaryPath, 'core.hooksPath', 'local')) ??
    (await configGet(cwd, gitBinaryPath, 'core.hooksPath', 'global'))

  if (hooksPath) {
    if (hooksPath.startsWith('/') || /^[A-Za-z]:/.test(hooksPath)) {
      return resolve(hooksPath)
    }
    const root = (
      await runGitOrThrow(buildRevParseShowToplevelArgs(), { cwd, gitBinaryPath })
    ).trim()
    return resolve(root, hooksPath)
  }

  const commonDir = await resolveGitCommonDir(cwd, gitBinaryPath)
  return join(commonDir, 'hooks')
}

export async function hooksList(
  cwd: string,
  gitBinaryPath: string
): Promise<GitHooksListResult> {
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  if (!existsSync(hooksDir)) {
    return { hooks: [], hooksDir }
  }

  const grouped = new Map<string, { active?: string; sample?: string; disabled?: string }>()

  for (const filename of readdirSync(hooksDir)) {
    const parsed = parseHookFilename(filename)
    if (!parsed) continue
    const entry = grouped.get(parsed.name) ?? {}
    if (parsed.variant === 'active') entry.active = filename
    else if (parsed.variant === 'sample') entry.sample = filename
    else entry.disabled = filename
    grouped.set(parsed.name, entry)
  }

  const hooks: GitHook[] = []
  for (const [name, variants] of grouped) {
    const active = variants.active
    const sample = variants.sample
    const disabled = variants.disabled
    const enabled = Boolean(active)
    let filename: string
    if (active) filename = active
    else if (sample) filename = sample
    else if (disabled) filename = disabled
    else continue

    const filePath = join(hooksDir, filename)
    hooks.push({
      name,
      filename,
      enabled,
      executable: isExecutable(filePath)
    })
  }

  hooks.sort((a, b) => a.name.localeCompare(b.name))
  return { hooks, hooksDir }
}

function findHookFile(hooksDir: string, name: string): string | null {
  for (const suffix of ['', SAMPLE_SUFFIX, DISABLED_SUFFIX]) {
    const filename = name + suffix
    const filePath = join(hooksDir, filename)
    if (existsSync(filePath)) return filePath
  }
  return null
}

export async function hooksRead(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<string> {
  validateHookName(name)
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  const filePath = findHookFile(hooksDir, name)
  if (!filePath) {
    throw new Error(`Hook not found: ${name}`)
  }
  return readFileSync(filePath, 'utf8')
}

export async function hooksWrite(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  content: string
): Promise<void> {
  validateHookName(name)
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  const filePath = join(hooksDir, name)
  writeFileSync(filePath, content, 'utf8')
  chmodSync(filePath, 0o755)
}

export async function hooksEnable(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<void> {
  validateHookName(name)
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  const activePath = join(hooksDir, name)
  if (existsSync(activePath)) {
    chmodSync(activePath, 0o755)
    return
  }
  const samplePath = join(hooksDir, name + SAMPLE_SUFFIX)
  const disabledPath = join(hooksDir, name + DISABLED_SUFFIX)
  if (existsSync(samplePath)) {
    renameSync(samplePath, activePath)
  } else if (existsSync(disabledPath)) {
    renameSync(disabledPath, activePath)
  } else {
    throw new Error(`Hook not found: ${name}`)
  }
  chmodSync(activePath, 0o755)
}

export async function hooksDisable(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<void> {
  validateHookName(name)
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  const activePath = join(hooksDir, name)
  if (!existsSync(activePath)) return
  const disabledPath = join(hooksDir, name + DISABLED_SUFFIX)
  renameSync(activePath, disabledPath)
}

export async function hooksDelete(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<void> {
  validateHookName(name)
  const hooksDir = await resolveHooksDir(cwd, gitBinaryPath)
  for (const suffix of ['', SAMPLE_SUFFIX, DISABLED_SUFFIX]) {
    const filePath = join(hooksDir, name + suffix)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  }
}
