import { describe, expect, it } from 'vitest'
import {
  parseAnalyzeChangesResponse,
  parseAnalyzePullRequestResponse,
  parseComposeCommitsResponse,
  parseExplainCommitResponse,
  parsePullRequestResponse,
  parseRefineCommitPlanResponse
} from './parsers'

describe('AI response parsers reject non-object JSON', () => {
  it.each([
    ['pull request', () => parsePullRequestResponse('null')],
    ['pull request analysis', () => parseAnalyzePullRequestResponse('null')],
    ['changes analysis', () => parseAnalyzeChangesResponse('null', ['a.ts'])],
    ['commit plan refinement', () => parseRefineCommitPlanResponse('null', ['a.ts'])]
  ])('%s', (_name, parse) => {
    expect(parse).toThrow('AI response was not a JSON object.')
  })

  it('reports invalid JSON for a pull request analysis', () => {
    expect(() => parseAnalyzePullRequestResponse('{oops')).toThrow(/not valid JSON/)
  })
})

describe('AI commit proposals', () => {
  it('fails when there are no files to assign commits to', () => {
    const response = JSON.stringify({ commits: [{ summary: 'x', files: ['a.ts'] }] })
    expect(() => parseAnalyzeChangesResponse(response, [])).toThrow(/no usable commit proposals/)
    expect(() => parseRefineCommitPlanResponse(response, [])).toThrow(/no usable commit proposals/)
    expect(() =>
      parseComposeCommitsResponse(JSON.stringify([{ summary: 'x', files: ['a.ts'] }]), [])
    ).toThrow(/no usable commit proposals for the staged files/)
  })

  it('matches files by path suffix and invents a summary when the AI gave none', () => {
    const proposals = parseComposeCommitsResponse(
      JSON.stringify([{ files: ['b.ts'] }]),
      ['src/b.ts']
    )
    expect(proposals).toEqual([
      expect.objectContaining({ files: ['src/b.ts'], summary: 'Update src/b.ts' })
    ])
  })
})

describe('parseExplainCommitResponse', () => {
  it('matches a mistyped long hash to the commit by its first seven characters', () => {
    const result = parseExplainCommitResponse(
      JSON.stringify({ commits: [{ shortHash: 'abcdef1zzz', summary: 'Did a thing' }] }),
      [{ hash: 'abcdef1234567890abcdef1234567890abcdef12', shortHash: 'abcdef1' }]
    )
    expect(result.commits[0]?.hash).toBe('abcdef1234567890abcdef1234567890abcdef12')
  })
})
