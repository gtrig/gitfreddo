import { describe, expect, it } from 'vitest'
import {
  averageConfidence,
  buildAiMessages,
  clampConfidence,
  extractChatCompletionContent,
  isNonChatModelId,
  normalizeBaseUrl,
  parseAnalyzeChangesResponse,
  parseAnalyzePullRequestResponse,
  parseComposeCommitsResponse,
  parseConflictResolveResponse,
  parseExplainCommitResponse,
  parseRefineCommitPlanResponse,
  parseRefinePullRequestAnalysisResponse,
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

  it('appends commit message instructions when recomposing an existing commit', () => {
    const { user } = buildAiMessages(
      'recompose_commit',
      {
        branch: 'main',
        filePaths: ['src/auth.ts'],
        currentText: 'fix: auth bug\n\nHandle expired tokens.',
        diffText: '+++ b/src/auth.ts\n+export function refresh() {}',
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            subject: 'fix: auth bug',
            message: 'fix: auth bug\n\nHandle expired tokens.',
            filePaths: ['src/auth.ts']
          }
        ]
      },
      { commitMessage: 'Use Conventional Commits with a scope.' }
    )
    expect(user).toContain('Commit message instructions:')
    expect(user).toContain('Use Conventional Commits with a scope.')
    expect(user).toContain('commit message instructions below')
    expect(user).toContain('abc123d')
    expect(user).toContain('Current message:')
    expect(user).toContain('+++ b/src/auth.ts')
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

  it('asks for refined commit plan with selected commits and chat history', () => {
    const { system, user } = buildAiMessages('refine_commit_plan', {
      branch: 'main',
      filePaths: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      commitPlan: [
        {
          summary: 'Add feature A',
          description: 'Implements A.',
          files: ['src/a.ts'],
          rationale: 'Self-contained.'
        },
        {
          summary: 'Add feature B',
          description: 'Implements B.',
          files: ['src/b.ts'],
          rationale: 'Related to A.'
        },
        {
          summary: 'Add feature C',
          description: 'Implements C.',
          files: ['src/c.ts'],
          rationale: 'Independent.'
        }
      ],
      selectedCommitIndices: [0, 1],
      chatHistory: [
        { role: 'user', content: 'Can you merge the first two?' },
        { role: 'assistant', content: 'Sure — I can combine commits 1 and 2.' }
      ],
      userMessage: 'Yes, merge them into one commit.'
    })

    expect(system).toContain('valid JSON')
    expect(user).toContain('main')
    expect(user).toContain('Add feature A')
    expect(user).toContain('Add feature B')
    expect(user).toContain('Commit 1')
    expect(user).toContain('Commit 2')
    expect(user).toContain('Selected commits (1-based indices the user is referring to): 1, 2')
    expect(user).toContain('Can you merge the first two?')
    expect(user).toContain('Yes, merge them into one commit.')
    expect(user).toContain('"message"')
    expect(user).toContain('"commits"')
  })
})

describe('parseRefineCommitPlanResponse', () => {
  const changedPaths = ['src/a.ts', 'src/b.ts', 'src/c.ts']

  it('parses assistant message and updated commit proposals', () => {
    const result = parseRefineCommitPlanResponse(
      JSON.stringify({
        message: 'Merged commits 1 and 2 into a single commit covering A and B.',
        commits: [
          {
            summary: 'Add features A and B',
            description: 'Combined implementation.',
            files: ['src/a.ts', 'src/b.ts'],
            rationale: 'Single cohesive feature.'
          },
          {
            summary: 'Add feature C',
            description: 'Implements C.',
            files: ['src/c.ts'],
            rationale: 'Independent.'
          }
        ]
      }),
      changedPaths
    )

    expect(result.message).toBe('Merged commits 1 and 2 into a single commit covering A and B.')
    expect(result.commits).toHaveLength(2)
    expect(result.commits[0]?.files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(result.commits[1]?.files).toEqual(['src/c.ts'])
  })

  it('parses feature groups in refined commit plans', () => {
    const result = parseRefineCommitPlanResponse(
      JSON.stringify({
        message: 'Regrouped commits.',
        features: [{ title: 'Combined', commits: [1] }],
        commits: [{ summary: 'Add A and B', files: ['src/a.ts', 'src/b.ts'] }]
      }),
      ['src/a.ts', 'src/b.ts']
    )

    expect(result.features).toEqual([{ title: 'Combined', commitIndices: [0] }])
  })

  it('rejects invalid JSON', () => {
    expect(() => parseRefineCommitPlanResponse('not json', changedPaths)).toThrow(/valid JSON/)
  })

  it('rejects empty commit list', () => {
    expect(() =>
      parseRefineCommitPlanResponse(JSON.stringify({ message: 'Done.', commits: [] }), changedPaths)
    ).toThrow(/no usable commit proposals/)
  })

  it('uses a default assistant message when omitted', () => {
    const result = parseRefineCommitPlanResponse(
      JSON.stringify({
        commits: [{ summary: 'feat: auth', files: ['src/a.ts'] }]
      }),
      ['src/a.ts']
    )
    expect(result.message).toBe('Updated the commit plan.')
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
    expect(() => parseExplainCommitResponse(JSON.stringify('nope'), commits)).toThrow(/JSON object/)
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

  it('ignores entries without usable explanation text', () => {
    expect(() =>
      parseExplainCommitResponse(
        JSON.stringify({
          summary: 'Nothing useful',
          commits: [{ shortHash: 'abc123d', summary: '', keyChanges: '', rationale: '' }]
        }),
        [{ hash: 'abc123def456', shortHash: 'abc123d' }]
      )
    ).toThrow(/no usable commit explanations/)
  })

  it('skips invalid commit entries but keeps valid ones', () => {
    const result = parseExplainCommitResponse(
      JSON.stringify({
        summary: 'Partial',
        commits: [
          null,
          { shortHash: 'abc123d', summary: 'Valid entry', keyChanges: '- change', rationale: '' },
          { shortHash: '', summary: 'Missing hash' }
        ]
      }),
      commits
    )

    expect(result.commits).toHaveLength(1)
    expect(result.commits[0]?.summary).toBe('Valid entry')
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

  it('parses feature groups linked to commit indices', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Auth flow and docs updated.',
        features: [
          { title: 'Auth', commits: [1, 2] },
          { title: 'Docs', commits: [3] }
        ],
        commits: [
          { message: 'feat: add auth core', files: ['src/auth.ts'] },
          { message: 'feat: add login form', files: ['src/login.tsx'] },
          { message: 'docs: update readme', files: ['README.md'] }
        ]
      }),
      changed
    )

    expect(result.features).toEqual([
      { title: 'Auth', commitIndices: [0, 1] },
      { title: 'Docs', commitIndices: [2] }
    ])
  })

  it('ignores invalid feature entries and duplicate commit assignments', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Partial grouping',
        features: [
          { title: 'Auth', commits: [1, 1, 99] },
          { title: '', commits: [2] },
          { title: 'Docs', commits: [2] }
        ],
        commits: [
          { message: 'feat: auth', files: ['src/auth.ts'] },
          { message: 'docs: readme', files: ['README.md'] }
        ]
      }),
      ['src/auth.ts', 'README.md']
    )

    expect(result.features).toEqual([
      { title: 'Auth', commitIndices: [0] },
      { title: 'Docs', commitIndices: [1] }
    ])
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
    expect(user).toContain('"features"')
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

  it('rejects null JSON payloads', () => {
    expect(() => parseAnalyzeChangesResponse('null', changed)).toThrow(/JSON object/)
  })

  it('uses zero-based commit indices in feature groups', () => {
    const result = parseAnalyzeChangesResponse(
      JSON.stringify({
        summary: 'Auth',
        features: [{ title: 'Auth', commitIndices: [0] }],
        commits: [{ message: 'feat: auth', files: ['src/auth.ts'] }]
      }),
      ['src/auth.ts']
    )

    expect(result.features).toEqual([{ title: 'Auth', commitIndices: [0] }])
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

  it('rejects array JSON payloads without a title', () => {
    expect(() => parsePullRequestResponse(JSON.stringify(['array']))).toThrow(/no PR title/)
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

  it('rejects empty proposal arrays and non-array payloads', () => {
    expect(() => parseComposeCommitsResponse(JSON.stringify([]), staged)).toThrow(/no commit proposals/)
    expect(() => parseComposeCommitsResponse(JSON.stringify({}), staged)).toThrow(/no commit proposals/)
  })

  it('resolves staged paths with leading ./ prefixes', () => {
    const proposals = parseComposeCommitsResponse(
      JSON.stringify([{ message: 'fix: auth', files: ['./src/auth.ts'] }]),
      ['src/auth.ts']
    )
    expect(proposals[0]?.files).toEqual(['src/auth.ts'])
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
    expect(averageConfidence([])).toBe(0)
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

  it('throws when resolutions array is missing or empty', () => {
    expect(() => parseConflictResolveResponse(JSON.stringify({}), 1)).toThrow(/resolutions/)
    expect(() =>
      parseConflictResolveResponse(JSON.stringify({ resolutions: [] }), 1)
    ).toThrow(/no usable conflict resolutions/)
  })

  it('skips invalid resolution entries but keeps valid ones', () => {
    const result = parseConflictResolveResponse(
      JSON.stringify({
        resolutions: [
          { hunkId: 'bad', text: 'nope' },
          null,
          { hunkId: 0, text: 'ok', analysis: 'fine', confidence: 80 }
        ]
      }),
      1
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.text).toBe('ok')
  })

  it('throws when every resolution entry is invalid', () => {
    expect(() =>
      parseConflictResolveResponse(
        JSON.stringify({
          resolutions: [{ hunkId: 'bad', text: 'nope' }, null, { hunkId: 1 }]
        }),
        1
      )
    ).toThrow(/no usable conflict resolutions/)
  })

  it('throws when response is not valid JSON or not an object', () => {
    expect(() => parseConflictResolveResponse('not json', 1)).toThrow(/valid JSON/)
    expect(() => parseConflictResolveResponse(JSON.stringify('nope'), 1)).toThrow(/JSON object/)
  })
})

describe('parseAnalyzePullRequestResponse', () => {
  it('parses structured pull request analysis', () => {
    const result = parseAnalyzePullRequestResponse(
      JSON.stringify({
        summary: 'Refactors auth flow',
        keyChanges: '- Token refresh\n- Session store',
        risks: 'Missing logout coverage',
        reviewFocus: 'Session edge cases',
        testingNotes: 'Run auth e2e'
      })
    )

    expect(result.summary).toBe('Refactors auth flow')
    expect(result.keyChanges).toContain('Token refresh')
    expect(result.risks).toContain('logout')
    expect(result.reviewFocus).toBe('Session edge cases')
    expect(result.testingNotes).toBe('Run auth e2e')
  })

  it('normalizes array fields into newline-separated text', () => {
    const result = parseAnalyzePullRequestResponse(
      JSON.stringify({
        summary: 'Auth refactor',
        keyChanges: ['Token refresh', 'Session store']
      })
    )

    expect(result.keyChanges).toBe('Token refresh\nSession store')
  })

  it('rejects empty analysis payloads', () => {
    expect(() =>
      parseAnalyzePullRequestResponse(JSON.stringify({ summary: '', keyChanges: '' }))
    ).toThrow(/empty pull request analysis/)
  })

  it('rejects array JSON payloads without analysis content', () => {
    expect(() => parseAnalyzePullRequestResponse(JSON.stringify(['not-an-object']))).toThrow(
      /empty pull request analysis/
    )
  })
})

describe('parseRefinePullRequestAnalysisResponse', () => {
  it('parses assistant reply and updated analysis', () => {
    const result = parseRefinePullRequestAnalysisResponse(
      JSON.stringify({
        message: 'I focused the risks on auth edge cases.',
        analysis: {
          summary: 'Auth refactor',
          keyChanges: '- Refresh tokens',
          risks: 'Expired session handling',
          reviewFocus: 'Token refresh path',
          testingNotes: 'Add logout test'
        }
      })
    )

    expect(result.message).toContain('focused the risks')
    expect(result.analysis.summary).toBe('Auth refactor')
    expect(result.analysis.risks).toContain('Expired session')
  })

  it('rejects missing analysis and reply message', () => {
    expect(() =>
      parseRefinePullRequestAnalysisResponse(
        JSON.stringify({ message: 'Updated', analysis: { summary: '', keyChanges: '' } })
      )
    ).toThrow(/empty pull request analysis/)
    expect(() =>
      parseRefinePullRequestAnalysisResponse(
        JSON.stringify({
          message: '',
          analysis: { summary: 'Auth', keyChanges: 'Refresh' }
        })
      )
    ).toThrow(/no reply message/)
    expect(() =>
      parseRefinePullRequestAnalysisResponse(JSON.stringify({ message: 'Updated' }))
    ).toThrow(/no updated pull request analysis/)
  })

  it('throws when response is not valid JSON or not an object', () => {
    expect(() => parseRefinePullRequestAnalysisResponse('not json')).toThrow(/valid JSON/)
    expect(() => parseRefinePullRequestAnalysisResponse(JSON.stringify('nope'))).toThrow(
      /JSON object/
    )
  })
})

describe('buildAiMessages analyze_pull_request', () => {
  it('includes pull request metadata and scope', () => {
    const { user } = buildAiMessages('analyze_pull_request', {
      prNumber: 7,
      prTitle: 'Add auth',
      headBranch: 'feature',
      baseBranch: 'main',
      analysisScope: 'partial',
      filePaths: ['src/auth.ts'],
      commitSubjects: ['Add refresh helper']
    })

    expect(user).toContain('Pull request #7')
    expect(user).toContain('Add auth')
    expect(user).toContain('Selected files')
    expect(user).toContain('src/auth.ts')
    expect(user).toContain('Add refresh helper')
  })

  it('builds resolve_conflict prompts with merge context', () => {
    const { system, user } = buildAiMessages('resolve_conflict', {
      branch: 'main',
      filePath: 'src/conflict.ts',
      operationKind: 'merge',
      incomingLabel: 'feature',
      sideA: 'ours',
      sideB: 'theirs',
      conflictContent: '<<<<<<<\n=======\n>>>>>>>'
    })

    expect(system).toContain('valid JSON')
    expect(user).toContain('src/conflict.ts')
    expect(user).toContain('feature')
    expect(user).toContain('ours')
  })

  it('builds refine pull request analysis prompts with prior analysis', () => {
    const { user } = buildAiMessages('refine_pull_request_analysis', {
      prNumber: 12,
      prTitle: 'Auth refactor',
      pullRequestAnalysis: {
        summary: 'Auth updates',
        keyChanges: 'Token refresh',
        risks: 'Edge cases',
        reviewFocus: 'Sessions',
        testingNotes: 'E2E auth'
      },
      chatHistory: [{ role: 'user', content: 'Focus on logout path' }],
      userMessage: 'Add more detail on risks'
    })

    expect(user).toContain('Auth updates')
    expect(user).toContain('logout path')
    expect(user).toContain('Add more detail on risks')
  })
})

describe('parsePullRequestResponse edge cases', () => {
  it('accepts fenced JSON and empty body', () => {
    const result = parsePullRequestResponse('```json\n{"title":"Feature","body":""}\n```')
    expect(result).toEqual({ title: 'Feature', body: '' })
  })

  it('throws when title is missing', () => {
    expect(() => parsePullRequestResponse(JSON.stringify({ body: 'Only body' }))).toThrow(
      /no PR title/
    )
  })
})

describe('parseComposeCommitsResponse edge cases', () => {
  it('resolves staged paths with leading ./ prefixes', () => {
    const result = parseComposeCommitsResponse(
      JSON.stringify([{ message: 'feat: auth', files: ['./src/auth.ts'] }]),
      ['src/auth.ts']
    )
    expect(result[0]?.files).toEqual(['src/auth.ts'])
  })

  it('throws when the response is empty', () => {
    expect(() => parseComposeCommitsResponse(JSON.stringify([]), ['src/auth.ts'])).toThrow(
      /no commit proposals/
    )
  })
})

describe('parseAnalyzePullRequestResponse edge cases', () => {
  it('accepts array-shaped analysis sections', () => {
    const result = parseAnalyzePullRequestResponse(
      JSON.stringify({
        summary: ['Line one', 'Line two'],
        keyChanges: ['Change A']
      })
    )
    expect(result.summary).toBe('Line one\nLine two')
    expect(result.keyChanges).toBe('Change A')
  })
})
