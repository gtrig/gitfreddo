import type {
  AiPullRequestProposal,
  AiAnalyzePullRequestResult,
  AiRefinePullRequestAnalysisResult,
  AiAnalyzeChangesResult,
  AiRefineCommitPlanResult,
  AiExplainCommitInput,
  AiExplainCommitEntry,
  AiExplainCommitResult,
  AiComposeCommitProposal,
  AiAnalyzeCommitProposal,
  AiAnalyzeFeatureGroup,
  AiConflictResolutionProposal
} from './types'

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseCommitMessageText(message: string): { summary: string; description: string } {
  const trimmed = message.trim()
  const paragraphs = trimmed.split(/\n\n/)
  if (paragraphs.length > 1) {
    return {
      summary: paragraphs[0]?.trim() ?? '',
      description: paragraphs.slice(1).join('\n\n').trim()
    }
  }

  const lines = trimmed.split('\n')
  if (lines.length > 1) {
    return {
      summary: lines[0]?.trim() ?? '',
      description: lines.slice(1).join('\n').trim()
    }
  }

  return { summary: trimmed, description: '' }
}

function resolveStagedPath(candidate: string, stagedPaths: string[]): string | undefined {
  const normalized = candidate.trim().replace(/^\.\//, '')
  if (!normalized) return undefined

  const exact = stagedPaths.find((path) => path === normalized)
  if (exact) return exact

  return stagedPaths.find((path) => path === candidate.trim() || path.endsWith(`/${normalized}`))
}

type RawCommitEntry = {
  message?: unknown
  files?: unknown
  summary?: unknown
  description?: unknown
  rationale?: unknown
}

function parseCommitProposalEntries(
  entries: unknown[],
  availablePaths: string[],
  options: { includeRationale?: boolean } = {}
): AiAnalyzeCommitProposal[] {
  const assigned = new Set<string>()
  const proposals: AiAnalyzeCommitProposal[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    const raw = entry as RawCommitEntry
    const filesInput = Array.isArray(raw.files) ? raw.files : []
    const resolvedFiles: string[] = []

    for (const file of filesInput) {
      if (typeof file !== 'string') continue
      const resolved = resolveStagedPath(file, availablePaths)
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

    proposals.push({
      summary,
      description,
      files: resolvedFiles,
      rationale:
        options.includeRationale && typeof raw.rationale === 'string' ? raw.rationale.trim() : ''
    })
  }

  const unassigned = availablePaths.filter((path) => !assigned.has(path))
  if (unassigned.length > 0) {
    proposals.push({
      summary: `Update ${unassigned.length === 1 ? unassigned[0] : `${unassigned.length} files`}`,
      description: '',
      files: unassigned,
      rationale: ''
    })
  }

  return proposals
}

function parseAnalyzeFeatureEntries(entries: unknown, commitCount: number): AiAnalyzeFeatureGroup[] {
  if (!Array.isArray(entries) || commitCount === 0) {
    return []
  }

  const assigned = new Set<number>()
  const features: AiAnalyzeFeatureGroup[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue

    const raw = entry as { title?: unknown; commits?: unknown; commitIndices?: unknown }
    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    if (!title) continue

    const indicesInput = Array.isArray(raw.commits)
      ? raw.commits
      : Array.isArray(raw.commitIndices)
        ? raw.commitIndices
        : []
    const commitIndices: number[] = []

    for (const index of indicesInput) {
      if (typeof index !== 'number' || !Number.isInteger(index)) continue

      const zeroBased =
        index >= 1 && index <= commitCount
          ? index - 1
          : index >= 0 && index < commitCount
            ? index
            : -1
      if (zeroBased < 0 || assigned.has(zeroBased)) continue

      commitIndices.push(zeroBased)
      assigned.add(zeroBased)
    }

    if (commitIndices.length === 0) continue

    features.push({
      title,
      commitIndices: commitIndices.sort((a, b) => a - b)
    })
  }

  return features
}

function normalizeAnalysisText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

export function parsePullRequestResponse(text: string): AiPullRequestProposal {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const raw = parsed as { title?: unknown; body?: unknown }
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const body = typeof raw.body === 'string' ? raw.body.trim() : ''

  if (!title) {
    throw new Error('AI returned no PR title.')
  }

  return { title, body }
}

function parseAnalyzePullRequestFields(raw: Record<string, unknown>): AiAnalyzePullRequestResult {
  return {
    summary: normalizeAnalysisText(raw.summary),
    keyChanges: normalizeAnalysisText(raw.keyChanges),
    risks: normalizeAnalysisText(raw.risks),
    reviewFocus: normalizeAnalysisText(raw.reviewFocus),
    testingNotes: normalizeAnalysisText(raw.testingNotes)
  }
}

export function parseAnalyzePullRequestResponse(text: string): AiAnalyzePullRequestResult {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const analysis = parseAnalyzePullRequestFields(parsed as Record<string, unknown>)
  if (!analysis.summary && !analysis.keyChanges) {
    throw new Error('AI returned an empty pull request analysis.')
  }

  return analysis
}

export function parseRefinePullRequestAnalysisResponse(
  text: string
): AiRefinePullRequestAnalysisResult {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const raw = parsed as { message?: unknown; analysis?: unknown }
  if (!raw.analysis || typeof raw.analysis !== 'object') {
    throw new Error('AI returned no updated pull request analysis.')
  }

  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  const analysis = parseAnalyzePullRequestFields(raw.analysis as Record<string, unknown>)

  if (!message) {
    throw new Error('AI returned no reply message.')
  }

  if (!analysis.summary && !analysis.keyChanges) {
    throw new Error('AI returned an empty pull request analysis.')
  }

  return { message, analysis }
}

export function parseAnalyzeChangesResponse(
  text: string,
  changedPaths: string[]
): AiAnalyzeChangesResult {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const raw = parsed as {
    summary?: unknown
    keyChanges?: unknown
    risks?: unknown
    features?: unknown
    commits?: unknown
  }

  const commits = Array.isArray(raw.commits)
    ? parseCommitProposalEntries(raw.commits, changedPaths, { includeRationale: true })
    : []

  if (commits.length === 0) {
    throw new Error('AI returned no usable commit proposals for the changed files.')
  }

  const features = parseAnalyzeFeatureEntries(raw.features, commits.length)

  return {
    summary: normalizeAnalysisText(raw.summary),
    keyChanges: normalizeAnalysisText(raw.keyChanges),
    risks: normalizeAnalysisText(raw.risks),
    features,
    commits
  }
}

export function parseRefineCommitPlanResponse(
  text: string,
  changedPaths: string[]
): AiRefineCommitPlanResult {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const raw = parsed as { message?: unknown; features?: unknown; commits?: unknown }
  if (!Array.isArray(raw.commits) || raw.commits.length === 0) {
    throw new Error('AI returned no usable commit proposals for the changed files.')
  }

  const commits = parseCommitProposalEntries(raw.commits, changedPaths, { includeRationale: true })

  if (commits.length === 0) {
    throw new Error('AI returned no usable commit proposals for the changed files.')
  }

  const features = parseAnalyzeFeatureEntries(raw.features, commits.length)

  const message =
    typeof raw.message === 'string' && raw.message.trim()
      ? raw.message.trim()
      : 'Updated the commit plan.'

  return { message, features, commits }
}

function resolveExplainCommitHash(
  shortHash: string,
  commits: Array<Pick<AiExplainCommitInput, 'hash' | 'shortHash'>>
): string | undefined {
  const normalized = shortHash.trim()
  if (!normalized) return undefined

  const exact = commits.find(
    (commit) => commit.shortHash === normalized || commit.hash.startsWith(normalized)
  )
  if (exact) return exact.hash

  return commits.find((commit) => commit.hash.startsWith(normalized.slice(0, 7)))?.hash
}

export function parseExplainCommitResponse(
  text: string,
  commits: Array<Pick<AiExplainCommitInput, 'hash' | 'shortHash'>>
): AiExplainCommitResult {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const raw = parsed as {
    summary?: unknown
    commits?: unknown
  }

  const entries = Array.isArray(raw.commits) ? raw.commits : []
  const explanations: AiExplainCommitEntry[] = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as {
      shortHash?: unknown
      hash?: unknown
      summary?: unknown
      keyChanges?: unknown
      rationale?: unknown
    }

    const shortHash =
      typeof item.shortHash === 'string'
        ? item.shortHash.trim()
        : typeof item.hash === 'string'
          ? item.hash.trim().slice(0, 7)
          : ''
    const hash = shortHash ? resolveExplainCommitHash(shortHash, commits) : undefined
    if (!hash || !shortHash) continue

    const summary = normalizeAnalysisText(item.summary)
    const keyChanges = normalizeAnalysisText(item.keyChanges)
    const rationale = normalizeAnalysisText(item.rationale)
    if (!summary && !keyChanges && !rationale) continue

    explanations.push({
      hash,
      shortHash,
      summary,
      keyChanges,
      rationale
    })
  }

  if (explanations.length === 0) {
    throw new Error('AI returned no usable commit explanations.')
  }

  return {
    summary: normalizeAnalysisText(raw.summary),
    commits: explanations
  }
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

  const proposals = parseCommitProposalEntries(parsed, stagedPaths)

  if (proposals.length === 0) {
    throw new Error('AI returned no usable commit proposals for the staged files.')
  }

  return proposals.map(({ rationale: _rationale, ...proposal }) => proposal)
}

export function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 50
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function proposalsToResolutionMap(
  proposals: AiConflictResolutionProposal[]
): Map<number, string> {
  return new Map(proposals.map((proposal) => [proposal.hunkId, proposal.text]))
}

export function averageConfidence(proposals: AiConflictResolutionProposal[]): number {
  if (proposals.length === 0) return 0
  const total = proposals.reduce((sum, proposal) => sum + proposal.confidence, 0)
  return Math.round(total / proposals.length)
}

export function parseConflictResolveResponse(
  text: string,
  expectedHunkCount: number
): AiConflictResolutionProposal[] {
  const cleaned = stripJsonFences(text)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI response was not valid JSON. Try again or adjust your AI settings.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response was not a JSON object.')
  }

  const resolutions = (parsed as { resolutions?: unknown }).resolutions
  if (!Array.isArray(resolutions)) {
    throw new Error('AI response missing "resolutions" array.')
  }

  const result: AiConflictResolutionProposal[] = []
  for (const entry of resolutions) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as {
      hunkId?: unknown
      text?: unknown
      analysis?: unknown
      confidence?: unknown
    }
    if (typeof raw.hunkId !== 'number' || typeof raw.text !== 'string') continue
    result.push({
      hunkId: raw.hunkId,
      text: raw.text,
      analysis: typeof raw.analysis === 'string' ? raw.analysis.trim() : '',
      confidence: clampConfidence(raw.confidence)
    })
  }

  if (result.length === 0) {
    throw new Error('AI returned no usable conflict resolutions.')
  }

  for (let id = 0; id < expectedHunkCount; id++) {
    if (!result.some((proposal) => proposal.hunkId === id)) {
      throw new Error(`AI response missing resolution for conflict ${id + 1} of ${expectedHunkCount}.`)
    }
  }

  return result.sort((a, b) => a.hunkId - b.hunkId)
}

