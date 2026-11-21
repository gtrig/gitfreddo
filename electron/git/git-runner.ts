import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import { emitLog } from './log-bus'
import { gitCommandNeedsCredentials, prepareGitEnv } from './credentials'
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
  /**
   * Wall-clock limit. Defaults to 120s for local commands; network commands
   * (clone/fetch/push/pull/…) have none and use the inactivity limit instead.
   */
  timeoutMs?: number
  /** Kill when git produces no output for this long. Network default: 5 min. */
  idleTimeoutMs?: number
  input?: string
  env?: NodeJS.ProcessEnv
}

const LOCAL_TIMEOUT_MS = 120_000
const NETWORK_IDLE_TIMEOUT_MS = 5 * 60_000
/** Time git gets to exit after SIGTERM before it is SIGKILLed. */
const KILL_GRACE_MS = 5_000
const GLOBAL_GIT_ARGS = ['-c', 'color.ui=never', '-c', 'core.quotepath=false'] as const

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
  { cwd, gitBinaryPath = 'git', timeoutMs, idleTimeoutMs, input, env: envOverride }: RunGitOptions
): Promise<GitResult> {
  const gitArgs = [...GLOBAL_GIT_ARGS, ...args]
  const cmd = `${gitBinaryPath} ${gitArgs.join(' ')}`
  emitLog('git', 'debug', `> ${cmd}`, cwd)

  const isNetwork = gitCommandNeedsCredentials(args)
  const wallClockMs = timeoutMs ?? (isNetwork ? undefined : LOCAL_TIMEOUT_MS)
  const idleMs = idleTimeoutMs ?? (isNetwork ? NETWORK_IDLE_TIMEOUT_MS : undefined)

  const prepared = await prepareGitEnv({ needsCredentials: isNetwork })
  const env = { ...prepared.env, ...envOverride }
  const releaseEnv = () => {
    void prepared.cleanup().catch(() => undefined)
  }
  const mayRunHooks = gitCommandMayRunHooks(args)
  if (mayRunHooks) {
    env.GIT_TRACE = '1'
  }

  return new Promise((resolve, reject) => {
    const child = spawn(gitBinaryPath, gitArgs, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Collect raw bytes and decode once: decoding chunk by chunk splits multi-byte
    // UTF-8 characters that straddle a chunk boundary.
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const stderrDecoder = new StringDecoder('utf8')
    let settled = false
    let exited = false
    let wallTimer: ReturnType<typeof setTimeout> | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let killTimer: ReturnType<typeof setTimeout> | undefined

    const clearTimers = () => {
      if (wallTimer) clearTimeout(wallTimer)
      if (idleTimer) clearTimeout(idleTimer)
    }

    const terminate = (reason: string) => {
      if (settled) return
      settled = true
      clearTimers()
      child.kill('SIGTERM')
      killTimer = setTimeout(() => {
        if (!exited) child.kill('SIGKILL')
      }, KILL_GRACE_MS)
      reject(new Error(`${reason}: ${cmd}`))
    }

    const armIdle = () => {
      if (idleMs === undefined || settled) return
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(
        () => terminate(`git command stopped: no output for ${Math.round(idleMs / 1000)}s`),
        idleMs
      )
    }

    if (wallClockMs !== undefined) {
      wallTimer = setTimeout(
        () => terminate(`git command timed out after ${wallClockMs}ms`),
        wallClockMs
      )
    }
    armIdle()

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      armIdle()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      armIdle()
      if (mayRunHooks) {
        const output = stripGitTraceLines(stderrDecoder.write(chunk))
        if (output) {
          emitLog('operation', 'info', output)
        }
      }
    })

    // git may exit before reading all of stdin (e.g. a rejected patch): that EPIPE
    // is expected and the exit code reports the real failure.
    child.stdin.on('error', () => undefined)

    child.on('error', (error) => {
      exited = true
      releaseEnv()
      if (killTimer) clearTimeout(killTimer)
      if (settled) return
      settled = true
      clearTimers()
      emitLog('git', 'error', `Failed to run git`, error.message)
      reject(new Error(`Failed to run git: ${error.message}`))
    })

    child.on('close', (code) => {
      exited = true
      releaseEnv()
      if (killTimer) clearTimeout(killTimer)
      if (settled) return
      settled = true
      clearTimers()
      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')
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
    }
    child.stdin.end()
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
  return runGit(args, {
    ...options,
    timeoutMs: options.timeoutMs ?? descriptor.timeoutMs,
    input: stdin,
    env
  })
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
