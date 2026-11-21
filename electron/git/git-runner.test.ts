import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitHookExecution, GitHookFailure } from './hook-failure'

const mocks = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  emitLog: vi.fn(),
  envCleanup: vi.fn(async () => {}),
  prepareGitEnv: vi.fn(),
  gitCommandNeedsCredentials: vi.fn((args: string[]) => args[0] === 'fetch'),
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
vi.mock('./credentials', () => ({
  prepareGitEnv: mocks.prepareGitEnv,
  gitCommandNeedsCredentials: mocks.gitCommandNeedsCredentials
}))
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
    stdin: EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
    kill: ReturnType<typeof vi.fn>
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.stdin = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() })
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
    mocks.prepareGitEnv.mockImplementation(async () => ({ env: {}, cleanup: mocks.envCleanup }))
    mocks.gitCommandMayRunHooks.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks for credentials only for network commands and cleans up after exit', async () => {
    mockChild({ exitCode: 0, stdout: '' })
    await runGit(['fetch', 'origin'], { cwd: '/repo' })
    expect(mocks.prepareGitEnv).toHaveBeenLastCalledWith({ needsCredentials: true })
    expect(mocks.envCleanup).toHaveBeenCalledTimes(1)

    mockChild({ exitCode: 0, stdout: '' })
    await runGit(['status'], { cwd: '/repo' })
    expect(mocks.prepareGitEnv).toHaveBeenLastCalledWith({ needsCredentials: false })
  })

  it('cleans up the credentials env when git fails to spawn', async () => {
    mockChild({ error: new Error('ENOENT') })
    await expect(runGit(['fetch'], { cwd: '/repo' })).rejects.toThrow(/Failed to run git/)
    expect(mocks.envCleanup).toHaveBeenCalledTimes(1)
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
      ['-c', 'color.ui=never', '-c', 'core.quotepath=false', '-c', 'user.name=Test', 'branch', '--show-current'],
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
    mocks.prepareGitEnv.mockImplementation(async () => ({ env: {}, cleanup: mocks.envCleanup }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('times out long-running commands', async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
      stdin: EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
      kill: ReturnType<typeof vi.fn>
    }
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.stdin = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() })
    child.kill = vi.fn()
    mocks.spawnMock.mockReturnValue(child)

    const promise = runGit(['status'], { cwd: '/repo', timeoutMs: 10 })
    const timedOut = expect(promise).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(11)
    await timedOut
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })
})

function silentChild() {
  const stdin = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn() })
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin,
    kill: vi.fn()
  })
  mocks.spawnMock.mockReturnValue(child)
  return child
}

describe('git-runner output decoding and stdin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mocks.gitCommandMayRunHooks.mockReturnValue(false)
    mocks.prepareGitEnv.mockImplementation(async () => ({ env: {}, cleanup: mocks.envCleanup }))
  })

  it('keeps multi-byte characters intact when split across chunks', async () => {
    const child = silentChild()
    const bytes = Buffer.from('Γειά σου κόσμε\n', 'utf8')
    const promise = runGit(['log'], { cwd: '/repo' })
    await vi.waitFor(() => expect(mocks.spawnMock).toHaveBeenCalled())
    // Split inside the two-byte 'ε' and inside 'ά'.
    child.stdout.emit('data', bytes.subarray(0, 3))
    child.stdout.emit('data', bytes.subarray(3, 7))
    child.stdout.emit('data', bytes.subarray(7))
    child.stderr.emit('data', Buffer.from('ά', 'utf8').subarray(0, 1))
    child.stderr.emit('data', Buffer.from('ά', 'utf8').subarray(1))
    child.emit('close', 0)

    await expect(promise).resolves.toMatchObject({ stdout: 'Γειά σου κόσμε\n', stderr: 'ά' })
  })

  it('does not crash when git closes stdin early (EPIPE)', async () => {
    const child = silentChild()
    child.stdin.write.mockImplementation(() => {
      process.nextTick(() =>
        child.stdin.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))
      )
      return true
    })
    const promise = runGit(['apply', '--cached'], { cwd: '/repo', input: 'x'.repeat(10) })
    await vi.waitFor(() => expect(child.stdin.write).toHaveBeenCalled())
    await new Promise((resolve) => setImmediate(resolve))
    child.stderr.emit('data', Buffer.from('error: corrupt patch'))
    child.emit('close', 128)

    await expect(promise).resolves.toMatchObject({ code: 128, stderr: 'error: corrupt patch' })
  })
})

describe('git-runner network inactivity and kill escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.gitCommandMayRunHooks.mockReturnValue(false)
    mocks.prepareGitEnv.mockImplementation(async () => ({ env: {}, cleanup: mocks.envCleanup }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a network command run past the local limit while it keeps producing output', async () => {
    const child = silentChild()
    const promise = runGit(['fetch', 'origin'], { cwd: '/repo' })
    await vi.advanceTimersByTimeAsync(0)
    for (let minute = 0; minute < 10; minute += 1) {
      child.stderr.emit('data', Buffer.from(`Receiving objects: ${minute}0%\r`))
      await vi.advanceTimersByTimeAsync(60_000)
    }
    expect(child.kill).not.toHaveBeenCalled()
    child.emit('close', 0)
    await expect(promise).resolves.toMatchObject({ code: 0 })
  })

  it('stops a network command that goes silent', async () => {
    const child = silentChild()
    const promise = runGit(['fetch', 'origin'], { cwd: '/repo' })
    const rejected = expect(promise).rejects.toThrow(/no output/i)
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1)
    await rejected
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('escalates to SIGKILL when git ignores SIGTERM', async () => {
    const child = silentChild()
    const promise = runGit(['status'], { cwd: '/repo', timeoutMs: 1000 })
    const rejected = expect(promise).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(1001)
    await rejected
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
    expect(child.kill).not.toHaveBeenCalledWith('SIGKILL')
    await vi.advanceTimersByTimeAsync(5001)
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('does not SIGKILL a process that exited after SIGTERM', async () => {
    const child = silentChild()
    child.kill.mockImplementation((signal: string) => {
      if (signal === 'SIGTERM') process.nextTick(() => child.emit('close', null))
    })
    const promise = runGit(['status'], { cwd: '/repo', timeoutMs: 1000 })
    const rejected = expect(promise).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(1001)
    await rejected
    await vi.advanceTimersByTimeAsync(6000)
    expect(child.kill).not.toHaveBeenCalledWith('SIGKILL')
  })
})
