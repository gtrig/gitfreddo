export type AiFillPurpose = 'commit_message' | 'stash_message'

export type AiProvider = 'local' | 'api'

export interface AiFillContext {
  branch?: string
  filePaths?: string[]
  currentText?: string
  diffText?: string
}

export interface AiFillParams {
  purpose: AiFillPurpose
  context?: AiFillContext
}

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }
  if (trimmed.endsWith('/v1')) {
    return trimmed
  }
  return `${trimmed}/v1`
}

export function buildAiMessages(
  purpose: AiFillPurpose,
  context: AiFillContext = {}
): { system: string; user: string } {
  const files =
    context.filePaths && context.filePaths.length > 0
      ? context.filePaths.map((p) => `- ${p}`).join('\n')
      : null
  const seed = context.currentText?.trim()
  const branch = context.branch?.trim()
  const diffBlock = context.diffText?.trim()
    ? `\nChanges (unified diff):\n${context.diffText.trim()}\n`
    : ''

  const system =
    'You write concise, technical text for git workflows. ' +
    'Respond with only the requested text — no quotes, markdown fences, or preamble.'

  let user: string

  switch (purpose) {
    case 'commit_message':
      user =
        'Write a git commit message for the staged changes.\n' +
        'Use an imperative subject line (≤72 chars) and an optional body separated by a blank line.\n' +
        (branch ? `Branch: ${branch}\n` : '') +
        (files ? `Staged files:\n${files}\n` : '') +
        diffBlock +
        (seed ? `Starting idea: ${seed}\n` : '') +
        'Summarize the actual code changes clearly based on the diff when provided.'
      break
    case 'stash_message':
      user =
        'Write a short git stash message describing work in progress.\n' +
        (branch ? `Branch: ${branch}\n` : '') +
        (files ? `Changed files:\n${files}\n` : '') +
        diffBlock +
        (seed ? `Starting idea: ${seed}\n` : '') +
        'Keep it brief and informal; reflect the diff when provided.'
      break
  }

  return { system, user }
}
