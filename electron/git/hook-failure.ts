import { HOOK_RESULT_LOG_PREFIX } from '../../shared/git/hook-log'

export interface GitHookFailure {
  hookName: string
  message: string
  details?: string
}

export interface GitHookExecution {
  hookName: string
  output: string
  passed: boolean
}

interface GitCommandResult {
  stdout: string
  stderr: string
  code: number
}

const GIT_TRACE_LINE_RE = /^\d{2}:\d{2}:\d{2}\.\d+ (?:git\.c:|run-command\.c:)/

const HOOK_COMMANDS = new Set([
  'commit',
  'push',
  'merge',
  'rebase',
  'cherry-pick',
  'am',
  'pull',
  'checkout',
  'switch',
  'receive-pack'
])

const KNOWN_HOOK_NAMES = new Set([
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-merge-commit',
  'pre-push',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'post-update',
  'pre-auto-gc',
  'pre-receive',
  'update',
  'proc-receive',
  'push-to-checkout'
])

const HOOK_OUTPUT_RES = [
  /hook declined/i,
  /failed to push some refs/i,
  /husky/i,
  /\bpre-commit hook\b/i,
  /\bpre-push hook\b/i,
  /\bcommit-msg hook\b/i
]

export function gitCommandMayRunHooks(args: readonly string[]): boolean {
  const subcommand = args[0]
  return Boolean(subcommand && HOOK_COMMANDS.has(subcommand))
}

export function stripGitTraceLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => line.length > 0 && !GIT_TRACE_LINE_RE.test(line))
    .join('\n')
    .trim()
}

export function parseHookNameFromGitTrace(trace: string): string | null {
  const runCommandLines = trace.split('\n').filter((line) => line.includes('run_command:'))
  for (let index = runCommandLines.length - 1; index >= 0; index -= 1) {
    const line = runCommandLines[index] ?? ''
    for (const hookName of KNOWN_HOOK_NAMES) {
      if (
        line.includes(`/hooks/${hookName}`) ||
        line.includes(`\\hooks\\${hookName}`) ||
        line.includes(`/.githooks/${hookName}`) ||
        line.includes(`\\.githooks\\${hookName}`) ||
        line.endsWith(` ${hookName}`) ||
        line.endsWith(`/${hookName}`) ||
        line.endsWith(`\\${hookName}`)
      ) {
        return hookName
      }
    }
  }
  return null
}

function hookNameFromOutput(output: string): string | null {
  const pathMatch = output.match(/[/\\]hooks[/\\]([a-zA-Z0-9][a-zA-Z0-9._-]*)/)
  if (pathMatch && KNOWN_HOOK_NAMES.has(pathMatch[1] ?? '')) {
    return pathMatch[1] ?? null
  }
  return null
}

function resolveHookName(rawStderr: string, output: string): string | null {
  return (
    parseHookNameFromGitTrace(rawStderr) ??
    hookNameFromOutput(output) ??
    (HOOK_OUTPUT_RES.some((pattern) => pattern.test(output)) ? 'hook' : null)
  )
}

export function detectGitHookExecution(
  result: GitCommandResult,
  rawStderr = result.stderr
): GitHookExecution | null {
  const output = stripGitTraceLines(`${rawStderr}\n${result.stdout}`.trim())
  const hookName = resolveHookName(rawStderr, output)
  if (!hookName) return null
  return {
    hookName,
    output,
    passed: result.code === 0
  }
}

export function formatHookResultLogMessage(execution: GitHookExecution): string {
  return `${HOOK_RESULT_LOG_PREFIX}${execution.passed ? 'passed' : 'failed'}:${execution.hookName}`
}

export function detectGitHookFailure(
  _args: readonly string[],
  result: GitCommandResult,
  rawStderr = result.stderr
): GitHookFailure | null {
  if (result.code === 0) return null

  const execution = detectGitHookExecution(result, rawStderr)
  if (!execution) return null

  const label =
    execution.hookName === 'hook' ? 'Git hook' : `Git hook failed: ${execution.hookName}`
  return {
    hookName: execution.hookName,
    message: label,
    details: execution.output || undefined
  }
}
