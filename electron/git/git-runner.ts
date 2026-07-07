import { spawn } from 'child_process'
import { emitLog } from './log-bus'
import { buildGitEnv } from './credentials'
import type { GitCommandDescriptor } from '../../shared/git/commands'

export interface GitResult {
  stdout: string
  stderr: string
  code: number
}

export interface RunGitOptions {
  cwd: string
  gitBinaryPath?: string
  timeoutMs?: number
  input?: string
  env?: NodeJS.ProcessEnv
}

const DEFAULT_TIMEOUT_MS = 120_000
const COLOR_OFF_ARGS = ['-c', 'color.ui=never'] as const

function prependConfig(
  args: readonly string[],
  config?: readonly (readonly [string, string])[]
): string[] {
  if (!config || config.length === 0) return [...args]
  const configArgs = config.flatMap(([key, value]) => ['-c', `${key}=${value}`])
  return [...configArgs, ...args]
}

export async function runGit(
  args: string[],
  { cwd, gitBinaryPath = 'git', timeoutMs = DEFAULT_TIMEOUT_MS, input, env: envOverride }: RunGitOptions
): Promise<GitResult> {
  const gitArgs = [...COLOR_OFF_ARGS, ...args]
  const cmd = `${gitBinaryPath} ${gitArgs.join(' ')}`
  emitLog('git', 'debug', `> ${cmd}`, cwd)

  const env = { ...(await buildGitEnv()), ...envOverride }

  return new Promise((resolve, reject) => {
    const child = spawn(gitBinaryPath, gitArgs, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        reject(new Error(`git command timed out after ${timeoutMs}ms: ${cmd}`))
      }
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      emitLog('git', 'error', `Failed to run git`, error.message)
      reject(new Error(`Failed to run git: ${error.message}`))
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const result: GitResult = { stdout, stderr, code: code ?? 1 }
      if (code !== 0) {
        emitLog('git', 'warn', `git exited ${code}`, stderr.trim() || stdout.trim())
      }
      resolve(result)
    })

    if (input !== undefined) {
      child.stdin.write(input)
      child.stdin.end()
    } else {
      child.stdin.end()
    }
  })
}

export async function runGitOrThrow(
  args: string[],
  options: RunGitOptions
): Promise<string> {
  const result = await runGit(args, options)
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `git exited with code ${result.code}`
    throw new Error(detail)
  }
  return result.stdout
}

export async function runCommand<T>(
  descriptor: GitCommandDescriptor<T>,
  params: T,
  options: RunGitOptions
): Promise<GitResult> {
  const args = prependConfig(descriptor.buildArgs(params), descriptor.config)
  const stdin =
    descriptor.stdin === undefined
      ? options.input
      : typeof descriptor.stdin === 'function'
        ? descriptor.stdin(params)
        : options.input
  const env = descriptor.env ? { ...options.env, ...descriptor.env(params) } : options.env
  return runGit(args, { ...options, input: stdin, env })
}

export async function runCommandOrThrow<T>(
  descriptor: GitCommandDescriptor<T>,
  params: T,
  options: RunGitOptions
): Promise<string> {
  const result = await runCommand(descriptor, params, options)
  const accept = descriptor.acceptExitCodes ?? [0]
  if (!accept.includes(result.code)) {
    const detail = result.stderr.trim() || result.stdout.trim() || `git exited with code ${result.code}`
    throw new Error(detail)
  }
  return result.stdout
}

/** Resolves a user-supplied ref to a full object name (safe for argv). */
export async function resolveGitRef(
  cwd: string,
  gitBinaryPath: string,
  ref: string
): Promise<string> {
  const { revParseVerify } = await import('../../shared/git/commands')
  return (await runCommandOrThrow(revParseVerify, { ref }, { cwd, gitBinaryPath })).trim()
}
