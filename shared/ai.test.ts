import { describe, expect, it } from 'vitest'
import {
  averageConfidence,
  buildAiMessages,
  clampConfidence,
  extractChatCompletionContent,
  isNonChatModelId,
  normalizeBaseUrl,
  parseAnalyzeChangesResponse,
  parseComposeCommitsResponse,
  parseConflictResolveResponse,
  parseExplainCommitResponse,
  parsePullRequestResponse,
  pickChatModelId,
  proposalsToResolutionMap
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
    expect(user).toContain('Commit message instructions:')
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

  it('asks for structured JSON analysis with ordered commit proposals', () => {
    const { system, user } = buildAiMessages('analyze_changes', {
      branch: 'feature/auth',
      filePaths: ['src/auth.ts', 'README.md'],
      stagedFilePaths: ['src/auth.ts'],
      unstagedFilePaths: ['README.md'],
      diffText: '+++ b/src/auth.ts\n+export function login() {}'
    })
    expect(system).toContain('valid JSON')
    expect(user).toContain('feature/auth')
    expect(user).toContain('Staged files')
    expect(user).toContain('src/auth.ts')
    expect(user).toContain('Unstaged files')
    expect(user).toContain('README.md')
    expect(user).toContain('+++ b/src/auth.ts')
    expect(user).toContain('self-contained')
    expect(user).toContain('"commits"')
  })

  it('appends commit message instructions when analyzing uncommitted changes', () => {
    const { user } = buildAiMessages(
      'analyze_changes',
      {
        branch: 'feature/auth',
        filePaths: ['src/auth.ts'],
        stagedFilePaths: ['src/auth.ts']
      },
      { commitMessage: 'Use Conventional Commits with a scope.' }
    )
    expect(user).toContain('Commit message instructions:')
    expect(user).toContain('Use Conventional Commits with a scope.')
    expect(user).toContain('commit message instructions below')
  })

  it('asks for JSON pull request title and body with branch context', () => {
    const { system, user } = buildAiMessages(
      'pull_request',
      {
        headBranch: 'feature/auth',
        baseBranch: 'main',
        filePaths: ['src/auth.ts'],
        diffText: '+++ b/src/auth.ts\n+export function login() {}',
        currentText: 'Title: WIP auth'
      },
      { commitMessage: 'Use Conventional Commits.' }
    )
    expect(system).toContain('valid JSON')
    expect(user).toContain('feature/auth')
    expect(user).toContain('main')
    expect(user).toContain('src/auth.ts')
    expect(user).toContain('WIP auth')
    expect(user).toContain('"title"')
    expect(user).toContain('Use Conventional Commits.')
  })

  it('asks for structured JSON when explaining commits', () => {
    const { system, user } = buildAiMessages('explain_commit', {
      branch: 'main',
      commits: [
        {
          hash: 'abc123def456',
          shortHash: 'abc123d',
          subject: 'Add login helper',
          message: 'Add login helper\n\nExpose shared auth utility.',
          author: 'Ada Lovelace',
          date: '2026-01-01T00:00:00Z',
          filePaths: ['src/auth.ts']
        }
      ],
      diffText: '+++ b/src/auth.ts\n+export function login() {}'
    })
    expect(system).toContain('valid JSON')
    expect(user).toContain('main')
    expect(user).toContain('abc123d')
    expect(user).toContain('Add login helper')
    expect(user).toContain('src/auth.ts')
    expect(user).toContain('+++ b/src/auth.ts')
    expect(user).toContain('"rationale"')
  })
})

describe('parseExplainCommitResponse', () => {
  const commits = [
    { hash: 'abc123def456', shortHash: 'abc123d' },
    { hash: 'def456abc789', shortHash: 'def456a' }
  ]

  it('parses summary and per-commit explanations', () => {
    const result = parseExplainCommitResponse(
      JSON.stringify({
        summary: 'Auth and docs updated across two commits.',
        commits: [
          {
            shortHash: 'abc123d',
            summary: 'Added login helper.',
            keyChanges: '- New login() export',
            rationale: 'Centralizes authentication for upcoming UI work.'
          },
          {
            shortHash: 'def456a',
            summary: 'Documented login flow.',
            keyChanges: '- README section',
            rationale: 'Helps contributors understand the new auth API.'
          }
        ]
      }),
      commits
    )

    expect(result.summary).toBe('Auth and docs updated across two commits.')
    expect(result.commits).toHaveLength(2)
    expect(result.commits[0]).toMatchObject({
      hash: 'abc123def456',
      shortHash: 'abc123d',
      summary: 'Added login helper.',
      keyChanges: '- New login() export',
      rationale: 'Centralizes authentication for upcoming UI work.'
    })
  })

  it('rejects invalid JSON', () => {
    expect(() => parseExplainCommitResponse('not json', commits)).toThrow(/valid JSON/)
  })

  it('requires at least one commit explanation', () => {
    expect(() =>
      parseExplainCommitResponse(JSON.stringify({ summary: 'Nothing useful', commits: [] }), commits)
    ).toThrow(/no usable commit explanations/)
  })

  it('accepts full hash when short hash is omitted', () => {
    const result = parseExplainCommitResponse(
      JSON.stringify({
        summary: 'One commit explained.',
        commits: [
          {
            hash: 'abc123def456',
            summary: 'Added login helper.',
            keyChanges: '- login()',
            rationale: 'Shared auth entry point.'
          }
        ]
      }),
      [{ hash: 'abc123def456', shortHash: 'abc123d' }]
    )

    expect(result.commits[0]?.hash).toBe('abc123def456')
    expect(result.commits[0]?.shortHash).toBe('abc123d')
  })
})

describe('parseAnalyzeChangesResponse', () => {
  const changed = ['src/auth.ts', 'src/login.tsx', 'README.md']

  it('parses analysis sections and ordered commit proposals', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Auth flow and docs updated.',
        keyChanges: '- Added login helper\n- Updated readme',
        risks: 'None',
        commits: [
          {
            message: 'feat: add auth core\n\nLogin helper.',
            files: ['src/auth.ts'],
            rationale: 'Foundation for login UI.'
          },
          {
            message: 'feat: add login form',
            files: ['src/login.tsx'],
            rationale: 'Depends on auth core.'
          },
          { message: 'docs: update readme', files: ['README.md'], rationale: 'Documents new flow.' }
        ]
      }),
      changed
    )

    expect(result.summary).toBe('Auth flow and docs updated.')
    expect(result.keyChanges).toContain('login helper')
    expect(result.risks).toBe('None')
    expect(result.commits).toHaveLength(3)
    expect(result.commits[0]?.summary).toBe('feat: add auth core')
    expect(result.commits[0]?.description).toBe('Login helper.')
    expect(result.commits[0]?.rationale).toContain('Foundation')
    expect(result.commits[1]?.files).toEqual(['src/login.tsx'])
  })

  it('parses explicit summary and description fields on commit proposals', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Auth updates',
        commits: [
          {
            summary: 'feat(auth): add login helper',
            description: 'Introduce session handling and token validation.',
            files: ['src/auth.ts'],
            rationale: 'Foundation for login UI.'
          }
        ]
      }),
      ['src/auth.ts']
    )

    expect(result.commits[0]?.summary).toBe('feat(auth): add login helper')
    expect(result.commits[0]?.description).toBe(
      'Introduce session handling and token validation.'
    )
  })

  it('splits a single-line-break message into subject and description', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Docs',
        commits: [
          {
            message: 'docs: update readme\nDocument the new authentication flow.',
            files: ['README.md']
          }
        ]
      }),
      ['README.md']
    )

    expect(result.commits[0]?.summary).toBe('docs: update readme')
    expect(result.commits[0]?.description).toBe('Document the new authentication flow.')
  })

  it('asks for commit descriptions in the analyze_changes prompt', () => {
    const { user } = buildAiMessages('analyze_changes', {
      filePaths: ['src/a.ts']
    })
    expect(user).toContain('"description"')
    expect(user).not.toContain('optional body')
  })

  it('adds unassigned changed files to a fallback commit', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Partial plan',
        commits: [{ message: 'feat: auth', files: ['src/auth.ts'] }]
      }),
      changed
    )

    expect(result.commits).toHaveLength(2)
    expect(result.commits[1]?.files).toEqual(['src/login.tsx', 'README.md'])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAnalyzeChangesResponse('not json', changed)).toThrow('valid JSON')
  })
})

describe('parsePullRequestResponse', () => {
  it('parses title and body from JSON', () => {
    const proposal = parsePullRequestResponse(
      JSON.stringify({
        title: 'Add login flow',
        body: '## Summary\nAdds login.'
      })
    )
    expect(proposal).toEqual({
      title: 'Add login flow',
      body: '## Summary\nAdds login.'
    })
  })

  it('throws when title is missing', () => {
    expect(() => parsePullRequestResponse(JSON.stringify({ body: 'Only body' }))).toThrow('no PR title')
  })

  it('throws on invalid JSON', () => {
    expect(() => parsePullRequestResponse('not json')).toThrow('valid JSON')
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

describe('ai helper utilities', () => {
  it('clamps confidence values', () => {
    expect(clampConfidence(150)).toBe(100)
    expect(clampConfidence(-5)).toBe(0)
    expect(clampConfidence('80')).toBe(50)
  })

  it('maps proposals and averages confidence', () => {
    const proposals = [
      { hunkId: 0, text: 'a', analysis: '', confidence: 80 },
      { hunkId: 1, text: 'b', analysis: '', confidence: 60 }
    ]
    expect(proposalsToResolutionMap(proposals)).toEqual(
      new Map([
        [0, 'a'],
        [1, 'b']
      ])
    )
    expect(averageConfidence(proposals)).toBe(70)
  })

  it('detects non-chat model ids', () => {
    expect(isNonChatModelId('text-embedding-3-small')).toBe(true)
    expect(isNonChatModelId('llama3')).toBe(false)
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
