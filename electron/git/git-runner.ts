import { spawn } from 'child_process'
import { emitLog } from './log-bus'
import { buildGitEnv } from './credentials'
import { detectGitHookFailure, detectGitHookExecution, formatHookResultLogMessage, gitCommandMayRunHooks, stripGitTraceLines } from './hook-failure'
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
  if (gitCommandMayRunHooks(args)) {
    env.GIT_TRACE = '1'
  }

  const mayRunHooks = gitCommandMayRunHooks(args)

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
      const text = chunk.toString('utf8')
      stderr += text
      if (mayRunHooks) {
        const output = stripGitTraceLines(text)
        if (output) {
          emitLog('operation', 'info', output)
        }
      }
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
      const exitCode = code ?? 1
      const result: GitResult = { stdout, stderr, code: exitCode }
      if (exitCode !== 0) {
        const displayOutput = stripGitTraceLines(stderr.trim() || stdout.trim())
        emitLog('git', 'warn', `git exited ${exitCode}`, displayOutput)
        const hookFailure = detectGitHookFailure(args, result, stderr)
        if (hookFailure) {
          emitLog('app', 'error', hookFailure.message, hookFailure.details)
        }
      }
      if (mayRunHooks) {
        const hookExecution = detectGitHookExecution(result, stderr)
        if (hookExecution) {
          emitLog(
            'operation',
            hookExecution.passed ? 'info' : 'error',
            formatHookResultLogMessage(hookExecution),
            hookExecution.output || undefined
          )
        }
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

function formatGitCommandError(result: GitResult): string {
  const raw = result.stderr.trim() || result.stdout.trim()
  const detail = stripGitTraceLines(raw)
  if (detail) return detail
  if (raw) return raw
  return `git exited with code ${result.code}`
}

export async function runGitOrThrow(
  args: string[],
  options: RunGitOptions
): Promise<string> {
  const result = await runGit(args, options)
  if (result.code !== 0) {
    throw new Error(formatGitCommandError(result))
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
    throw new Error(formatGitCommandError(result))
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
