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
