import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitHookExecution, GitHookFailure } from './hook-failure'

const mocks = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  emitLog: vi.fn(),
  buildGitEnv: vi.fn(async () => ({})),
  detectGitHookFailure: vi.fn<() => GitHookFailure | null>(() => null),
  detectGitHookExecution: vi.fn<() => GitHookExecution | null>(() => null),
  formatHookResultLogMessage: vi.fn(() => 'hook ran'),
  gitCommandMayRunHooks: vi.fn(() => false),
  stripGitTraceLines: vi.fn((value: string) => value)
}))

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mocks.spawnMock(...args)
}))

vi.mock('./log-bus', () => ({ emitLog: mocks.emitLog }))
vi.mock('./credentials', () => ({ buildGitEnv: mocks.buildGitEnv }))
vi.mock('./hook-failure', () => ({
  detectGitHookFailure: mocks.detectGitHookFailure,
  detectGitHookExecution: mocks.detectGitHookExecution,
  formatHookResultLogMessage: mocks.formatHookResultLogMessage,
  gitCommandMayRunHooks: mocks.gitCommandMayRunHooks,
  stripGitTraceLines: mocks.stripGitTraceLines
}))

import { runCommand, runCommandOrThrow, runGit, runGitOrThrow } from './git-runner'

function mockChild(options: {
  exitCode?: number | null
  stdout?: string
  stderr?: string
  error?: Error
}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
    kill: ReturnType<typeof vi.fn>
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.stdin = { write: vi.fn(), end: vi.fn() }
  child.kill = vi.fn()
  mocks.spawnMock.mockReturnValue(child)

  process.nextTick(() => {
    if (options.error) {
      child.emit('error', options.error)
      return
    }
    if (options.stdout) child.stdout.emit('data', Buffer.from(options.stdout))
    if (options.stderr) child.stderr.emit('data', Buffer.from(options.stderr))
    child.emit('close', options.exitCode ?? 0)
  })

  return child
}

describe('git-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mocks.gitCommandMayRunHooks.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns stdout on success', async () => {
    mockChild({ exitCode: 0, stdout: 'ok\n' })
    await expect(runGit(['status'], { cwd: '/repo' })).resolves.toMatchObject({
      stdout: 'ok\n',
      code: 0
    })
  })

  it('throws from runGitOrThrow when git exits non-zero', async () => {
    mockChild({ exitCode: 1, stderr: 'fatal: bad ref' })
    await expect(runGitOrThrow(['rev-parse', 'missing'], { cwd: '/repo' })).rejects.toThrow(
      /bad ref/
    )
  })

  it('rejects when spawn fails', async () => {
    mockChild({ error: new Error('spawn ENOENT') })
    await expect(runGit(['status'], { cwd: '/repo' })).rejects.toThrow(/Failed to run git/)
    expect(mocks.emitLog).toHaveBeenCalledWith('git', 'error', expect.any(String), expect.any(String))
  })

  it('writes stdin when input is provided', async () => {
    const child = mockChild({ exitCode: 0, stdout: 'applied\n' })
    await runGit(['apply'], { cwd: '/repo', input: 'patch\n' })
    expect(child.stdin.write).toHaveBeenCalledWith('patch\n')
    expect(child.stdin.end).toHaveBeenCalled()
  })

  it('runs command descriptors with config and stdin', async () => {
    mockChild({ exitCode: 0, stdout: 'main\n' })
    const descriptor = {
      id: 'branch.show-current',
      subcommand: 'branch',
      buildArgs: () => ['branch', '--show-current'],
      config: [['user.name', 'Test']] as const,
      stdin: () => 'ignored\n'
    }

    await runCommand(descriptor, undefined, { cwd: '/repo' })

    expect(mocks.spawnMock).toHaveBeenCalledWith(
      'git',
      ['-c', 'color.ui=never', '-c', 'user.name=Test', 'branch', '--show-current'],
      expect.objectContaining({ cwd: '/repo' })
    )
  })

  it('accepts alternate exit codes from runCommandOrThrow', async () => {
    mockChild({ exitCode: 1, stdout: 'conflict\n' })
    const descriptor = {
      id: 'merge-tree',
      subcommand: 'merge-tree',
      buildArgs: () => ['merge-tree', 'HEAD'],
      acceptExitCodes: [0, 1] as const
    }

    await expect(runCommandOrThrow(descriptor, undefined, { cwd: '/repo' })).resolves.toBe(
      'conflict\n'
    )
  })

  it('logs hook stderr output when hooks may run', async () => {
    mocks.gitCommandMayRunHooks.mockReturnValue(true)
    mockChild({ exitCode: 0, stderr: 'trace: running pre-commit\nhook output\n' })

    await runGit(['commit', '-m', 'test'], { cwd: '/repo' })

    expect(mocks.stripGitTraceLines).toHaveBeenCalled()
    expect(mocks.emitLog).toHaveBeenCalledWith('git', 'debug', expect.stringContaining('commit'), '/repo')
    expect(mocks.emitLog).toHaveBeenCalledWith('operation', 'info', expect.any(String))
  })

  it('logs hook failures and execution results on non-zero exit', async () => {
    mocks.gitCommandMayRunHooks.mockReturnValue(true)
    mocks.detectGitHookFailure.mockReturnValue({
      hookName: 'pre-commit',
      message: 'pre-commit hook failed',
      details: 'lint errors'
    })
    mocks.detectGitHookExecution.mockReturnValue({
      hookName: 'pre-commit',
      passed: false,
      output: 'hook stderr'
    })
    mockChild({ exitCode: 1, stderr: 'trace: hook\nfailed\n', stdout: '' })

    const result = await runGit(['commit', '-m', 'test'], { cwd: '/repo' })

    expect(result.code).toBe(1)
    expect(mocks.emitLog).toHaveBeenCalledWith('app', 'error', 'pre-commit hook failed', 'lint errors')
    expect(mocks.emitLog).toHaveBeenCalledWith('operation', 'error', expect.any(String), 'hook stderr')
  })

  it('rejects runCommandOrThrow when exit code is not accepted', async () => {
    mockChild({ exitCode: 2, stderr: 'fatal: merge failed' })
    const descriptor = {
      id: 'merge-tree',
      subcommand: 'merge-tree',
      buildArgs: () => ['merge-tree', 'HEAD'],
      acceptExitCodes: [0, 1] as const
    }

    await expect(runCommandOrThrow(descriptor, undefined, { cwd: '/repo' })).rejects.toThrow(
      /merge failed/
    )
  })
})

describe('git-runner timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.gitCommandMayRunHooks.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('times out long-running commands', async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
      stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
      kill: ReturnType<typeof vi.fn>
    }
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.stdin = { write: vi.fn(), end: vi.fn() }
    child.kill = vi.fn()
    mocks.spawnMock.mockReturnValue(child)

    const promise = runGit(['status'], { cwd: '/repo', timeoutMs: 10 })
    const timedOut = expect(promise).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(11)
    await timedOut
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })
})
