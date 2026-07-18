export type AiFillPurpose =
  | 'commit_message'
  | 'recompose_commit'
  | 'stash_message'
  | 'compose_commits'
  | 'resolve_conflict'
  | 'analyze_changes'
  | 'refine_commit_plan'
  | 'explain_commit'
  | 'pull_request'
  | 'analyze_pull_request'
  | 'refine_pull_request_analysis'

export interface AiComposeCommitProposal {
  summary: string
  description: string
  files: string[]
}

export interface AiAnalyzeCommitProposal extends AiComposeCommitProposal {
  rationale: string
}

export interface AiAnalyzeFeatureGroup {
  title: string
  commitIndices: number[]
}

export interface AiAnalyzeChangesResult {
  summary: string
  keyChanges: string
  risks: string
  features: AiAnalyzeFeatureGroup[]
  commits: AiAnalyzeCommitProposal[]
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiRefineCommitPlanResult {
  message: string
  features: AiAnalyzeFeatureGroup[]
  commits: AiAnalyzeCommitProposal[]
}

export interface AiExplainCommitInput {
  hash: string
  shortHash: string
  subject: string
  message?: string
  author?: string
  date?: string
  filePaths?: string[]
}

export interface AiExplainCommitEntry {
  hash: string
  shortHash: string
  summary: string
  keyChanges: string
  rationale: string
}

export interface AiExplainCommitResult {
  summary: string
  commits: AiExplainCommitEntry[]
}

export interface AiPullRequestProposal {
  title: string
  body: string
}

export type AiPullRequestAnalysisScope = 'full' | 'partial'

export interface AiAnalyzePullRequestResult {
  summary: string
  keyChanges: string
  risks: string
  reviewFocus: string
  testingNotes: string
}

export interface AiRefinePullRequestAnalysisResult {
  message: string
  analysis: AiAnalyzePullRequestResult
}

export interface AiPullRequestChangedFileStat {
  path: string
  additions: number
  deletions: number
}

export interface AiConflictResolutionProposal {
  hunkId: number
  text: string
  analysis: string
  confidence: number
}

export type AiProvider = 'local' | 'api'

export interface AiFillContext {
  branch?: string
  headBranch?: string
  baseBranch?: string
  filePaths?: string[]
  stagedFilePaths?: string[]
  unstagedFilePaths?: string[]
  currentText?: string
  diffText?: string
  commits?: AiExplainCommitInput[]
  filePath?: string
  sideA?: string
  sideB?: string
  sideBase?: string
  conflictContent?: string
  operationKind?: 'merge' | 'rebase' | 'cherry-pick'
  incomingLabel?: string
  commitPlan?: AiAnalyzeCommitProposal[]
  selectedCommitIndices?: number[]
  chatHistory?: AiChatMessage[]
  userMessage?: string
  prNumber?: number
  prTitle?: string
  prBody?: string
  headSha?: string
  baseSha?: string
  analysisScope?: AiPullRequestAnalysisScope
  pullRequestAnalysis?: AiAnalyzePullRequestResult
  commitSubjects?: string[]
  changedFileStats?: AiPullRequestChangedFileStat[]
}

export interface AiFillParams {
  purpose: AiFillPurpose
  context?: AiFillContext
}

export interface AiCustomInstructions {
  system?: string
  commitMessage?: string
  stashMessage?: string
  conflictResolve?: string
  analyze?: string
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
