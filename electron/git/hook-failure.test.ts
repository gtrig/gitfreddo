import { describe, expect, it } from 'vitest'
import {
  detectGitHookExecution,
  detectGitHookFailure,
  gitCommandMayRunHooks,
  parseHookNameFromGitTrace,
  stripGitTraceLines
} from './hook-failure'

describe('hook-failure', () => {
  it('detects hook commands that may run hooks', () => {
    expect(gitCommandMayRunHooks(['commit', '-m', 'x'])).toBe(true)
    expect(gitCommandMayRunHooks(['status'])).toBe(false)
  })

  it('strips git trace lines from stderr', () => {
    const stderr = `07:44:43.607402 git.c:463               trace: built-in: git push origin main
07:44:43.609992 run-command.c:659       trace: run_command: .git/hooks/pre-push origin /tmp/hook-bare
HOOK FAILED MESSAGE
error: failed to push some refs to '/tmp/hook-bare'`

    expect(stripGitTraceLines(stderr)).toBe(
      "HOOK FAILED MESSAGE\nerror: failed to push some refs to '/tmp/hook-bare'"
    )
  })

  it('parses hook name from git trace output', () => {
    const trace = `07:44:48.949672 run-command.c:659       trace: run_command: GIT_EDITOR=: GIT_INDEX_FILE=.git/index .git/hooks/pre-commit`

    expect(parseHookNameFromGitTrace(trace)).toBe('pre-commit')
  })

  it('detects a failed pre-push hook for app logging', () => {
    const stderr = `07:44:43.609992 run-command.c:659       trace: run_command: .git/hooks/pre-push origin /tmp/hook-bare
HOOK FAILED MESSAGE
error: failed to push some refs to '/tmp/hook-bare'`

    const failure = detectGitHookFailure(['push', 'origin', 'main'], {
      stdout: '',
      stderr,
      code: 1
    })

    expect(failure).toEqual({
      hookName: 'pre-push',
      message: 'Git hook failed: pre-push',
      details: "HOOK FAILED MESSAGE\nerror: failed to push some refs to '/tmp/hook-bare'"
    })
  })

  it('detects a failed pre-commit hook even when hook stderr is empty', () => {
    const stderr = `07:44:48.949672 run-command.c:659       trace: run_command: GIT_EDITOR=: GIT_INDEX_FILE=.git/index .git/hooks/pre-commit`

    const failure = detectGitHookFailure(['commit', '-m', 'test'], {
      stdout: '',
      stderr,
      code: 1
    })

    expect(failure?.hookName).toBe('pre-commit')
    expect(failure?.message).toBe('Git hook failed: pre-commit')
  })

  it('detects a passed hook execution from git trace output', () => {
    const stderr = `07:44:43.609992 run-command.c:659       trace: run_command: .git/hooks/pre-push origin /tmp/hook-bare`

    const execution = detectGitHookExecution(
      {
        stdout: '',
        stderr,
        code: 0
      },
      stderr
    )

    expect(execution).toEqual({
      hookName: 'pre-push',
      output: '',
      passed: true
    })
  })

  it('returns null for non-hook git failures', () => {
    const failure = detectGitHookFailure(['status'], {
      stdout: '',
      stderr: 'fatal: not a git repository',
      code: 128
    })

    expect(failure).toBeNull()
  })
})
