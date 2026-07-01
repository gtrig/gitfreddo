export type AiFillPurpose = 'commit_message' | 'stash_message' | 'compose_commits'

export interface AiComposeCommitProposal {
  summary: string
  description: string
  files: string[]
}

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

export interface AiCustomInstructions {
  system?: string
  commitMessage?: string
  stashMessage?: string
}

function appendCustomInstructions(base: string, custom?: string): string {
  const extra = custom?.trim()
  if (!extra) {
    return base
  }
  return `${base}\n\n${extra}`
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
  context: AiFillContext = {},
  instructions: AiCustomInstructions = {}
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

  const system = appendCustomInstructions(
  purpose === 'compose_commits'
    ? 'You write concise, technical text for git workflows. ' +
        'Respond with only valid JSON — no quotes around the whole payload, markdown fences, or preamble.'
    : 'You write concise, technical text for git workflows. ' +
        'Respond with only the requested text — no quotes, markdown fences, or preamble.',
  instructions.system
)

  let user: string

  switch (purpose) {
    case 'commit_message':
      user = appendCustomInstructions(
        'Write a git commit message for the staged changes.\n' +
          'Use an imperative subject line (≤72 chars) and an optional body separated by a blank line.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (files ? `Staged files:\n${files}\n` : '') +
          diffBlock +
          (seed ? `Starting idea: ${seed}\n` : '') +
          'Summarize the actual code changes clearly based on the diff when provided.',
        instructions.commitMessage
      )
      break
    case 'stash_message':
      user = appendCustomInstructions(
        'Write a short git stash message describing work in progress.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (files ? `Changed files:\n${files}\n` : '') +
          diffBlock +
          (seed ? `Starting idea: ${seed}\n` : '') +
          'Keep it brief and informal; reflect the diff when provided.',
        instructions.stashMessage
      )
      break
    case 'compose_commits':
      user = appendCustomInstructions(
        'Analyze the staged changes and split them into one or more logical commits.\n' +
          'Each commit should represent a single coherent feature, fix, or concern.\n' +
          'Separate unrelated changes into different commits when appropriate.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (files ? `Staged files:\n${files}\n` : '') +
          diffBlock +
          'Return ONLY a JSON array with this shape:\n' +
          '[\n' +
          '  {\n' +
          '    "message": "imperative subject (≤72 chars)\\n\\noptional body",\n' +
          '    "files": ["exact/path/from/staged/list"]\n' +
          '  }\n' +
          ']\n' +
          'Rules:\n' +
          '- Every staged file must appear in exactly one commit files array\n' +
          '- Use exact file paths from the staged files list\n' +
          '- Order commits logically (foundational changes before dependents)\n' +
          '- If all changes belong together, return a single-element array',
        instructions.commitMessage
      )
      break
  }

  return { system, user }
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseCommitMessageText(message: string): { summary: string; description: string } {
  const trimmed = message.trim()
  const split = trimmed.split(/\n\n/)
  const summary = split[0]?.trim() ?? ''
  const description = split.slice(1).join('\n\n').trim()
  return { summary, description }
}

function resolveStagedPath(candidate: string, stagedPaths: string[]): string | undefined {
  const normalized = candidate.trim().replace(/^\.\//, '')
  if (!normalized) return undefined

  const exact = stagedPaths.find((path) => path === normalized)
  if (exact) return exact

  return stagedPaths.find((path) => path === candidate.trim() || path.endsWith(`/${normalized}`))
}

export function parseComposeCommitsResponse(
  text: string,
  stagedPaths: string[]
): AiComposeCommitProposal[] {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned no commit proposals.')
  }

  const assigned = new Set<string>()
  const proposals: AiComposeCommitProposal[] = []

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue

    const raw = entry as { message?: unknown; files?: unknown; summary?: unknown; description?: unknown }
    const filesInput = Array.isArray(raw.files) ? raw.files : []
    const resolvedFiles: string[] = []

    for (const file of filesInput) {
      if (typeof file !== 'string') continue
      const resolved = resolveStagedPath(file, stagedPaths)
      if (resolved && !assigned.has(resolved)) {
        resolvedFiles.push(resolved)
        assigned.add(resolved)
      }
    }

    if (resolvedFiles.length === 0) continue

    let summary = ''
    let description = ''

    if (typeof raw.summary === 'string' && raw.summary.trim()) {
      summary = raw.summary.trim()
      description = typeof raw.description === 'string' ? raw.description.trim() : ''
    } else if (typeof raw.message === 'string' && raw.message.trim()) {
      const parts = parseCommitMessageText(raw.message)
      summary = parts.summary
      description = parts.description
    }

    if (!summary) {
      summary = `Update ${resolvedFiles.length === 1 ? resolvedFiles[0] : `${resolvedFiles.length} files`}`
    }

    proposals.push({ summary, description, files: resolvedFiles })
  }

  const unassigned = stagedPaths.filter((path) => !assigned.has(path))
  if (unassigned.length > 0) {
    proposals.push({
      summary: `Update ${unassigned.length === 1 ? unassigned[0] : `${unassigned.length} files`}`,
      description: '',
      files: unassigned
    })
  }

  if (proposals.length === 0) {
    throw new Error('AI returned no usable commit proposals for the staged files.')
  }

  return proposals
}

type ContentPart = string | { type?: string; text?: string }

export interface ChatCompletionBody {
  choices?: Array<{
    text?: string
    finish_reason?: string
    message?: {
      content?: string | ContentPart[] | null
      reasoning?: string
      reasoning_content?: string
    }
  }>
  error?: { message?: string }
}

export function isNonChatModelId(id: string): boolean {
  return /embed|embedding|rerank|whisper|tts|nomic-embed/i.test(id)
}

export function pickChatModelId(models: string[]): string | undefined {
  const ids = models.map((id) => id.trim()).filter(Boolean)
  if (ids.length === 0) return undefined
  return ids.find((id) => !isNonChatModelId(id)) ?? ids[0]
}

function contentFromParts(parts: ContentPart[]): string {
  return parts
    .map((part) => {
      if (typeof part === 'string') return part
      if (part?.text) return part.text
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

export function extractChatCompletionContent(body: ChatCompletionBody): string {
  if (body.error?.message?.trim()) {
    throw new Error(body.error.message.trim())
  }

  const choice = body.choices?.[0]
  if (!choice) return ''

  if (choice.text?.trim()) {
    return choice.text.trim()
  }

  const message = choice.message
  if (!message) return ''

  const raw = message.content
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim()
  }

  if (Array.isArray(raw)) {
    const joined = contentFromParts(raw).trim()
    if (joined) return joined
  }

  const reasoning = message.reasoning_content?.trim() || message.reasoning?.trim()
  if (reasoning) {
    return reasoning
  }

  return ''
}
