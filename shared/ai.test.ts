import { describe, expect, it } from 'vitest'
import {
  buildAiMessages,
  extractChatCompletionContent,
  normalizeBaseUrl,
  parseComposeCommitsResponse,
  parseConflictResolveResponse,
  pickChatModelId
} from './ai'

describe('normalizeBaseUrl', () => {
  it('appends /v1 when missing', () => {
    expect(normalizeBaseUrl('http://localhost:1234')).toBe('http://localhost:1234/v1')
  })

  it('preserves existing /v1 suffix', () => {
    expect(normalizeBaseUrl('http://localhost:1234/v1/')).toBe('http://localhost:1234/v1')
  })

  it('returns empty for blank input', () => {
    expect(normalizeBaseUrl('  ')).toBe('')
  })
})

describe('buildAiMessages', () => {
  it('includes seed text when provided', () => {
    const { user } = buildAiMessages('commit_message', { currentText: 'fix auth bug' })
    expect(user).toContain('fix auth bug')
  })

  it('includes branch and files for commit messages', () => {
    const { user } = buildAiMessages('commit_message', {
      branch: 'main',
      filePaths: ['src/auth.ts']
    })
    expect(user).toContain('main')
    expect(user).toContain('src/auth.ts')
  })

  it('includes diff text when provided', () => {
    const { user } = buildAiMessages('stash_message', {
      diffText: '+++ b/README.md\n+hello'
    })
    expect(user).toContain('+++ b/README.md')
  })

  it('appends custom system and purpose instructions', () => {
    const { system, user } = buildAiMessages(
      'commit_message',
      { currentText: 'fix bug' },
      {
        system: 'Always write in Spanish.',
        commitMessage: 'Include the JIRA ticket when mentioned in the diff.'
      }
    )
    expect(system).toContain('Always write in Spanish.')
    expect(user).toContain('Include the JIRA ticket')
    expect(user).toContain('fix bug')
  })

  it('asks for JSON commit groups when composing commits', () => {
    const { system, user } = buildAiMessages('compose_commits', {
      branch: 'main',
      filePaths: ['src/a.ts', 'docs/b.md']
    })
    expect(system).toContain('valid JSON')
    expect(user).toContain('JSON array')
    expect(user).toContain('src/a.ts')
    expect(user).toContain('docs/b.md')
  })
})

describe('parseComposeCommitsResponse', () => {
  const staged = ['src/auth.ts', 'src/login.tsx', 'README.md']

  it('parses message and files from JSON', () => {
    const proposals = parseComposeCommitsResponse(
      JSON.stringify([
        { message: 'feat: add auth\n\nLogin form and session.', files: ['src/auth.ts', 'src/login.tsx'] },
        { message: 'docs: update readme', files: ['README.md'] }
      ]),
      staged
    )

    expect(proposals).toHaveLength(2)
    expect(proposals[0]?.summary).toBe('feat: add auth')
    expect(proposals[0]?.description).toContain('Login form')
    expect(proposals[0]?.files).toEqual(['src/auth.ts', 'src/login.tsx'])
    expect(proposals[1]?.files).toEqual(['README.md'])
  })

  it('strips markdown fences before parsing', () => {
    const proposals = parseComposeCommitsResponse(
      '```json\n[{"message":"fix bug","files":["src/auth.ts"]}]\n```',
      ['src/auth.ts']
    )
    expect(proposals).toHaveLength(1)
    expect(proposals[0]?.files).toEqual(['src/auth.ts'])
  })

  it('adds unassigned staged files to a fallback commit', () => {
    const proposals = parseComposeCommitsResponse(
      JSON.stringify([{ message: 'feat: auth', files: ['src/auth.ts'] }]),
      staged
    )

    expect(proposals).toHaveLength(2)
    expect(proposals[1]?.files).toEqual(['src/login.tsx', 'README.md'])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseComposeCommitsResponse('not json', staged)).toThrow('valid JSON')
  })
})

describe('pickChatModelId', () => {
  it('skips embedding models when a chat model is available', () => {
    expect(pickChatModelId(['text-embedding-3-small', 'llama3'])).toBe('llama3')
  })

  it('falls back to first model when all look non-chat', () => {
    expect(pickChatModelId(['nomic-embed-text'])).toBe('nomic-embed-text')
  })
})

describe('extractChatCompletionContent', () => {
  it('reads string content from OpenAI-style responses', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { content: 'fix auth validation' } }]
      })
    ).toBe('fix auth validation')
  })

  it('reads array content parts', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { content: [{ type: 'text', text: 'hello' }] } }]
      })
    ).toBe('hello')
  })

  it('falls back to reasoning_content for reasoning models', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ message: { content: '', reasoning_content: 'Add login form' } }]
      })
    ).toBe('Add login form')
  })

  it('throws API error messages from the response body', () => {
    expect(() =>
      extractChatCompletionContent({ error: { message: 'model not found' } })
    ).toThrow('model not found')
  })

  it('reads legacy text completions and empty responses', () => {
    expect(
      extractChatCompletionContent({
        choices: [{ text: '  legacy completion  ' }]
      })
    ).toBe('legacy completion')
    expect(extractChatCompletionContent({ choices: [] })).toBe('')
  })
})

describe('parseConflictResolveResponse', () => {
  it('parses valid hunk resolutions with analysis and confidence', () => {
    const result = parseConflictResolveResponse(
      JSON.stringify({
        resolutions: [
          {
            hunkId: 0,
            text: 'merged line',
            analysis: 'Kept ours because theirs was empty.',
            confidence: 92
          },
          {
            hunkId: 1,
            text: 'second hunk',
            analysis: 'Combined both imports.',
            confidence: 78
          }
        ]
      }),
      2
    )
    expect(result).toHaveLength(2)
    expect(result[0]?.text).toBe('merged line')
    expect(result[0]?.analysis).toContain('Kept ours')
    expect(result[0]?.confidence).toBe(92)
    expect(result[1]?.text).toBe('second hunk')
    expect(result[1]?.confidence).toBe(78)
  })

  it('defaults missing analysis and confidence for backward compatibility', () => {
    const result = parseConflictResolveResponse(
      JSON.stringify({
        resolutions: [{ hunkId: 0, text: 'ok' }]
      }),
      1
    )
    expect(result[0]?.analysis).toBe('')
    expect(result[0]?.confidence).toBe(50)
  })

  it('clamps out-of-range confidence', () => {
    const result = parseConflictResolveResponse(
      JSON.stringify({
        resolutions: [{ hunkId: 0, text: 'ok', confidence: 150 }]
      }),
      1
    )
    expect(result[0]?.confidence).toBe(100)
  })

  it('strips markdown fences', () => {
    const result = parseConflictResolveResponse(
      '```json\n{"resolutions":[{"hunkId":0,"text":"ok","analysis":"fine","confidence":80}]}\n```',
      1
    )
    expect(result[0]?.text).toBe('ok')
  })

  it('throws when a hunk is missing', () => {
    expect(() =>
      parseConflictResolveResponse(
        JSON.stringify({ resolutions: [{ hunkId: 0, text: 'only one' }] }),
        2
      )
    ).toThrow(/missing resolution/)
  })
})
