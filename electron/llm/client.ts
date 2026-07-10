import {
  buildAiMessages,
  extractChatCompletionContent,
  normalizeBaseUrl,
  pickChatModelId,
  type AiCustomInstructions,
  type AiFillParams,
  type AiProvider,
  type ChatCompletionBody
} from '../../shared/ai'
import type { AppSettings } from '../../shared/ipc'

interface ModelsResponse {
  data?: Array<{ id?: string }>
}

export interface AiClientConfig {
  provider: AiProvider
  baseUrl: string
  apiKey: string
  model: string
  instructions: AiCustomInstructions
}

function stripModelResponse(text: string): string {
  return text
    .trim()
    .replace(/^```[\w]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
}

async function resolveModel(baseUrl: string, apiKey: string, model?: string): Promise<string> {
  if (model?.trim()) {
    return model.trim()
  }
  const headers: Record<string, string> = {}
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`
  }
  const response = await fetch(`${baseUrl}/models`, { headers })
  if (!response.ok) {
    throw new Error(`Models request failed (${response.status})`)
  }
  const body = (await response.json()) as ModelsResponse
  const ids = (body.data ?? []).map((entry) => entry.id ?? '').filter(Boolean)
  const id = pickChatModelId(ids)
  if (!id) {
    throw new Error('No models available from the configured endpoint')
  }
  return id
}

export function aiConfigFromSettings(settings: AppSettings): AiClientConfig {
  return {
    provider: settings.aiProvider ?? 'local',
    baseUrl: settings.aiBaseUrl ?? '',
    apiKey: settings.aiApiKey ?? '',
    model: settings.aiModel ?? '',
    instructions: {
      system: settings.aiSystemInstructions ?? '',
      commitMessage: settings.aiCommitInstructions ?? '',
      stashMessage: settings.aiStashInstructions ?? '',
      conflictResolve: settings.aiConflictInstructions ?? ''
    }
  }
}

export async function aiFill(config: AiClientConfig, params: AiFillParams): Promise<string> {
  const normalized = normalizeBaseUrl(config.baseUrl)
  if (!normalized) {
    throw new Error('AI base URL is not configured')
  }

  if (config.provider === 'api' && !config.apiKey.trim()) {
    throw new Error('API key is required when using cloud API provider')
  }

  const resolvedModel = await resolveModel(normalized, config.apiKey, config.model)
  const { system, user } = buildAiMessages(params.purpose, params.context, config.instructions)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`
  }

  const response = await fetch(`${normalized}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      // temperature: 0.4,
      max_tokens: 50000,
      stream: false
    })
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `AI request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`
    )
  }

  const body = (await response.json()) as ChatCompletionBody
  let content: string
  try {
    content = extractChatCompletionContent(body)
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }

  if (!content.trim()) {
    const model = resolvedModel
    const finishReason = body.choices?.[0]?.finish_reason ?? 'unknown'
    throw new Error(
      `AI returned an empty response (model: ${model}, finish_reason: ${finishReason}). ` +
        'Try setting an explicit chat model in Settings → AI assist.'
    )
  }
  return stripModelResponse(content)
}
