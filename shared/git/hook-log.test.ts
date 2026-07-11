import { describe, expect, it } from 'vitest'
import { HOOK_RESULT_LOG_PREFIX, parseHookResultLogMessage } from './hook-log'

describe('hook-log', () => {
  it('parses passed hook result messages', () => {
    expect(parseHookResultLogMessage(`${HOOK_RESULT_LOG_PREFIX}passed:pre-push`)).toEqual({
      status: 'passed',
      hookName: 'pre-push'
    })
  })

  it('parses failed hook result messages', () => {
    expect(parseHookResultLogMessage(`${HOOK_RESULT_LOG_PREFIX}failed:pre-commit`)).toEqual({
      status: 'failed',
      hookName: 'pre-commit'
    })
  })
})
