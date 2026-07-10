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
}

function appendCustomInstructions(base: string, custom?: string): string {
  const extra = custom?.trim()
  if (!extra) {
    return base
  }
  return `${base}\n\n${extra}`
}

const COMMIT_MESSAGE_INSTRUCTIONS_LABEL = 'Commit message instructions:'

function appendCommitMessageInstructions(base: string, custom?: string): string {
  return appendLabeledInstructions(base, COMMIT_MESSAGE_INSTRUCTIONS_LABEL, custom)
}

function appendLabeledInstructions(base: string, label: string, custom?: string): string {
  const extra = custom?.trim()
  if (!extra) {
    return base
  }
  return `${base}\n\n${label}\n${extra}`
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
  const stagedFiles =
    context.stagedFilePaths && context.stagedFilePaths.length > 0
      ? context.stagedFilePaths.map((p) => `- ${p}`).join('\n')
      : null
  const unstagedFiles =
    context.unstagedFilePaths && context.unstagedFilePaths.length > 0
      ? context.unstagedFilePaths.map((p) => `- ${p}`).join('\n')
      : null
  const seed = context.currentText?.trim()
  const branch = context.branch?.trim()
  const diffBlock = context.diffText?.trim()
    ? `\nChanges (unified diff):\n${context.diffText.trim()}\n`
    : ''

  const system = appendCustomInstructions(
  purpose === 'compose_commits' ||
  purpose === 'analyze_changes' ||
  purpose === 'refine_commit_plan' ||
  purpose === 'explain_commit' ||
  purpose === 'resolve_conflict' ||
  purpose === 'pull_request' ||
  purpose === 'analyze_pull_request' ||
  purpose === 'refine_pull_request_analysis'
    ? 'You write concise, technical text for git workflows. ' +
        'Respond with only valid JSON — no quotes around the whole payload, markdown fences, or preamble.'
    : 'You write concise, technical text for git workflows. ' +
        'Respond with only the requested text — no quotes, markdown fences, or preamble.',
  instructions.system
)

  let user: string

  switch (purpose) {
    case 'commit_message':
      user = appendCommitMessageInstructions(
        'Write a git commit message for the staged changes.\n' +
          'Use an imperative subject line (≤72 chars) and an optional body separated by a blank line.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (files ? `Staged files:\n${files}\n` : '') +
          diffBlock +
          (seed ? `Starting idea: ${seed}\n` : '') +
          'Summarize the actual code changes clearly based on the diff when provided.\n' +
          '- Follow the commit message instructions below when writing the subject and body',
        instructions.commitMessage
      )
      break
    case 'recompose_commit': {
      const recomposeCommit = context.commits?.[0]
      const commitLabel = recomposeCommit
        ? `Commit ${recomposeCommit.shortHash}: ${recomposeCommit.subject}\n`
        : ''
      user = appendCommitMessageInstructions(
        'Improve or rewrite the commit message for an existing commit.\n' +
          'Use an imperative subject line (≤72 chars) and an optional body separated by a blank line.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          commitLabel +
          (files ? `Changed files:\n${files}\n` : '') +
          diffBlock +
          (seed ? `Current message:\n${seed}\n` : '') +
          'Base the new message on the actual code changes in the diff when provided.\n' +
          '- Follow the commit message instructions below when writing the subject and body',
        instructions.commitMessage
      )
      break
    }
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
      user = appendCommitMessageInstructions(
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
          '- Follow the commit message instructions below for every proposed commit message\n' +
          '- If all changes belong together, return a single-element array',
        instructions.commitMessage
      )
      break
    case 'analyze_changes':
      user = appendCommitMessageInstructions(
        'Analyze the uncommitted working tree changes and propose an ordered commit plan.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (stagedFiles ? `Staged files:\n${stagedFiles}\n` : '') +
          (unstagedFiles ? `Unstaged files:\n${unstagedFiles}\n` : '') +
          (!stagedFiles && !unstagedFiles && files ? `Changed files:\n${files}\n` : '') +
          diffBlock +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "summary": "One short paragraph of what changed overall",\n' +
          '  "keyChanges": "Bullet-style notes grouped by area or concern",\n' +
          '  "risks": "Review notes or risks; say briefly if none",\n' +
          '  "features": [\n' +
          '    {\n' +
          '      "title": "Short feature or concern label (2-4 words)",\n' +
          '      "commits": [1, 2]\n' +
          '    }\n' +
          '  ],\n' +
          '  "commits": [\n' +
          '    {\n' +
          '      "summary": "imperative subject line (≤72 chars)",\n' +
          '      "description": "1-3 sentences explaining what changed and why",\n' +
          '      "files": ["exact/path/from/changed/list"],\n' +
          '      "rationale": "Why this commit is self-contained and its place in the sequence"\n' +
          '    }\n' +
          '  ]\n' +
          '}\n' +
          'Rules:\n' +
          '- Propose one or more commits split by feature, fix, or concern when that improves history\n' +
          '- Include a features array that groups proposed commits by feature or concern; use 1-based commit indices from the commits array\n' +
          '- Each commit should appear in exactly one feature group when multiple commits exist; use one feature when there is only one commit\n' +
          '- Feature titles should be short labels (2-4 words) such as "Auth", "API layer", or "Docs"\n' +
          '- Each commit must be self-contained: after each commit in order, the repo should still build and behave correctly\n' +
          '- Order commits with dependencies first (shared types/utilities before consumers, refactors before features that rely on them)\n' +
          '- Every changed file must appear in exactly one commit files array\n' +
          '- Use exact file paths from the changed files lists\n' +
          '- If all changes belong together, return a single-element commits array\n' +
          '- Base analysis and commit messages on the diff when provided\n' +
          '- Every commit must include a non-empty description explaining the change\n' +
          '- Follow the commit message instructions below for every proposed commit subject and body\n' +
          '- You may use a single "message" field instead of summary/description if it contains subject, blank line, then body',
        instructions.commitMessage
      )
      break
    case 'refine_commit_plan': {
      const plan = context.commitPlan ?? []
      const planBlock =
        plan.length > 0
          ? plan
              .map((commit, index) => {
                const lines = [
                  `Commit ${index + 1}:`,
                  `  summary: ${commit.summary}`,
                  commit.description ? `  description: ${commit.description}` : null,
                  commit.rationale ? `  rationale: ${commit.rationale}` : null,
                  `  files: ${JSON.stringify(commit.files)}`
                ].filter(Boolean)
                return lines.join('\n')
              })
              .join('\n\n')
          : null
      const selected =
        context.selectedCommitIndices && context.selectedCommitIndices.length > 0
          ? context.selectedCommitIndices.map((index) => index + 1).join(', ')
          : null
      const history =
        context.chatHistory && context.chatHistory.length > 0
          ? context.chatHistory
              .map((entry) => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`)
              .join('\n')
          : null
      const request = context.userMessage?.trim()
      user = appendCommitMessageInstructions(
        'Refine the proposed commit plan based on the user request.\n' +
          (branch ? `Branch: ${branch}\n` : '') +
          (files ? `All changed files:\n${files}\n` : '') +
          (planBlock ? `Current commit plan:\n${planBlock}\n` : '') +
          (selected ? `Selected commits (1-based indices the user is referring to): ${selected}\n` : '') +
          (history ? `Previous conversation:\n${history}\n` : '') +
          (request ? `Latest user request:\n${request}\n` : '') +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "message": "Brief reply explaining what you changed",\n' +
          '  "features": [\n' +
          '    {\n' +
          '      "title": "Short feature or concern label (2-4 words)",\n' +
          '      "commits": [1, 2]\n' +
          '    }\n' +
          '  ],\n' +
          '  "commits": [\n' +
          '    {\n' +
          '      "summary": "imperative subject line (≤72 chars)",\n' +
          '      "description": "1-3 sentences explaining what changed and why",\n' +
          '      "files": ["exact/path/from/changed/list"],\n' +
          '      "rationale": "Why this commit is self-contained and its place in the sequence"\n' +
          '    }\n' +
          '  ]\n' +
          '}\n' +
          'Rules:\n' +
          '- Apply the user request to the current plan; common requests include merging selected commits, splitting one commit, reordering, or regrouping by concern\n' +
          '- Include an updated features array grouping commits by feature or concern using 1-based commit indices\n' +
          '- When merging commits, combine their files into one commit with a unified summary and description\n' +
          '- When the user selected specific commits, focus changes on those unless the request affects the whole plan\n' +
          '- Every changed file must appear in exactly one commit files array\n' +
          '- Use exact file paths from the changed files list\n' +
          '- Order commits with dependencies first\n' +
          '- Keep commits self-contained and logically ordered\n' +
          '- "message" should briefly describe what you did in plain language\n' +
          '- Follow the commit message instructions below for every proposed commit subject and body\n' +
          '- You may use a single "message" field per commit instead of summary/description if it contains subject, blank line, then body',
        instructions.commitMessage
      )
      break
    }
    case 'explain_commit': {
      const explainCommits = context.commits ?? []
      const commitsBlock =
        explainCommits.length > 0
          ? explainCommits
              .map((commit) => {
                const lines = [
                  `Commit ${commit.shortHash}: ${commit.subject}`,
                  commit.author ? `Author: ${commit.author}` : null,
                  commit.date ? `Date: ${commit.date}` : null,
                  commit.message?.trim() ? `Message:\n${commit.message.trim()}` : null,
                  commit.filePaths && commit.filePaths.length > 0
                    ? `Files:\n${commit.filePaths.map((path) => `- ${path}`).join('\n')}`
                    : null
                ].filter(Boolean)
                return lines.join('\n')
              })
              .join('\n\n')
          : null
      user = appendCustomInstructions(
        'Analyze the provided git commit(s) and explain what changed and why.\n' +
          (branch ? `Branch context: ${branch}\n` : '') +
          (commitsBlock ? `Commits:\n${commitsBlock}\n` : '') +
          diffBlock +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "summary": "Overall summary in one short paragraph",\n' +
          '  "commits": [\n' +
          '    {\n' +
          '      "shortHash": "first 7 characters of the commit hash",\n' +
          '      "summary": "One sentence overview of this commit",\n' +
          '      "keyChanges": "Bullet-style notes on what changed",\n' +
          '      "rationale": "Likely motivation or reason for the changes based on code, message, and context"\n' +
          '    }\n' +
          '  ]\n' +
          '}\n' +
          'Rules:\n' +
          '- Base explanations on the diff when provided\n' +
          '- Include one entry per commit listed, in the same order\n' +
          '- rationale should explain likely intent; say briefly when uncertain\n' +
          '- keyChanges should group by area or file when helpful',
        instructions.system
      )
      break
    }
    case 'pull_request':
      user = appendCommitMessageInstructions(
        'Write a GitHub pull request title and description for the changes on the head branch.\n' +
          (context.headBranch ? `Head branch: ${context.headBranch}\n` : '') +
          (context.baseBranch ? `Base branch: ${context.baseBranch}\n` : '') +
          (files ? `Changed files:\n${files}\n` : '') +
          diffBlock +
          (seed ? `Starting idea:\n${seed}\n` : '') +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "title": "concise PR title (≤72 chars)",\n' +
          '  "body": "Markdown description with summary, key changes, and test notes"\n' +
          '}\n' +
          'Rules:\n' +
          '- Base title and body on the diff and branch context when provided\n' +
          '- Body should help reviewers understand what changed, why, and how to test\n' +
          '- Use markdown lists in the body when helpful',
        instructions.commitMessage
      )
      break
    case 'analyze_pull_request': {
      const scope =
        context.analysisScope === 'partial' ? 'Selected files in this pull request' : 'Entire pull request'
      const prTitle = context.prTitle?.trim()
      const prBody = context.prBody?.trim()
      const commitList =
        context.commitSubjects && context.commitSubjects.length > 0
          ? context.commitSubjects.map((subject) => `- ${subject}`).join('\n')
          : null
      const fileStats =
        context.changedFileStats && context.changedFileStats.length > 0
          ? context.changedFileStats
              .map(
                (file) =>
                  `- ${file.path} (+${file.additions} −${file.deletions})`
              )
              .join('\n')
          : null
      user = appendCustomInstructions(
        'Analyze this pull request to help a reviewer understand the change.\n' +
          (context.prNumber != null ? `Pull request #${context.prNumber}\n` : '') +
          (prTitle ? `Title: ${prTitle}\n` : '') +
          (context.headBranch ? `Head branch: ${context.headBranch}\n` : '') +
          (context.baseBranch ? `Base branch: ${context.baseBranch}\n` : '') +
          `Analysis scope: ${scope}\n` +
          (files ? `Files in scope:\n${files}\n` : '') +
          (fileStats ? `File stats:\n${fileStats}\n` : '') +
          (commitList ? `Commits:\n${commitList}\n` : '') +
          (prBody ? `Description:\n${prBody}\n` : '') +
          diffBlock +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "summary": "One short paragraph overview",\n' +
          '  "keyChanges": "Bullet-style notes grouped by area or concern",\n' +
          '  "risks": "Review risks, regressions, or missing tests; say briefly if none",\n' +
          '  "reviewFocus": "What to scrutinize first",\n' +
          '  "testingNotes": "How to validate the change"\n' +
          '}\n' +
          'Rules:\n' +
          '- Base the analysis on the diff when provided\n' +
          '- Focus only on files in scope when scope is partial\n' +
          '- Be concrete and reviewer-oriented\n' +
          '- Use plain text; markdown lists are fine inside string fields',
        instructions.system
      )
      break
    }
    case 'refine_pull_request_analysis': {
      const scope =
        context.analysisScope === 'partial' ? 'Selected files in this pull request' : 'Entire pull request'
      const analysis = context.pullRequestAnalysis
      const analysisBlock = analysis
        ? [
            'Current analysis:',
            `  summary: ${analysis.summary}`,
            `  keyChanges: ${analysis.keyChanges}`,
            `  risks: ${analysis.risks}`,
            `  reviewFocus: ${analysis.reviewFocus}`,
            `  testingNotes: ${analysis.testingNotes}`
          ].join('\n')
        : null
      const history =
        context.chatHistory && context.chatHistory.length > 0
          ? context.chatHistory
              .map((entry) => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`)
              .join('\n')
          : null
      const request = context.userMessage?.trim()
      user = appendCustomInstructions(
        'Refine the pull request review analysis based on the user request.\n' +
          (context.prNumber != null ? `Pull request #${context.prNumber}\n` : '') +
          (context.prTitle ? `Title: ${context.prTitle}\n` : '') +
          `Analysis scope: ${scope}\n` +
          (files ? `Files in scope:\n${files}\n` : '') +
          (analysisBlock ? `${analysisBlock}\n` : '') +
          diffBlock +
          (history ? `Previous conversation:\n${history}\n` : '') +
          (request ? `Latest user request:\n${request}\n` : '') +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "message": "Brief reply in plain language about what you changed or answered",\n' +
          '  "analysis": {\n' +
          '    "summary": "One short paragraph overview",\n' +
          '    "keyChanges": "Bullet-style notes grouped by area or concern",\n' +
          '    "risks": "Review risks, regressions, or missing tests; say briefly if none",\n' +
          '    "reviewFocus": "What to scrutinize first",\n' +
          '    "testingNotes": "How to validate the change"\n' +
          '  }\n' +
          '}\n' +
          'Rules:\n' +
          '- Apply the user request to the current analysis\n' +
          '- Keep analysis aligned with the files in scope unless the user expands scope\n' +
          '- "message" should answer the user directly and briefly\n' +
          '- Update only the analysis fields that the request affects when possible',
        instructions.system
      )
      break
    }
    case 'resolve_conflict': {
      const filePath = context.filePath?.trim()
      const op = context.operationKind ?? 'merge'
      const incoming = context.incomingLabel?.trim()
      const sideABlock = context.sideA?.trim()
        ? `\nSide A (ours / current branch):\n\`\`\`\n${context.sideA}\n\`\`\`\n`
        : ''
      const sideBBlock = context.sideB?.trim()
        ? `\nSide B (theirs / incoming):\n\`\`\`\n${context.sideB}\n\`\`\`\n`
        : ''
      const baseBlock = context.sideBase?.trim()
        ? `\nCommon ancestor (base):\n\`\`\`\n${context.sideBase}\n\`\`\`\n`
        : ''
      const markerBlock = context.conflictContent?.trim()
        ? `\nWorking tree file with conflict markers:\n\`\`\`\n${context.conflictContent}\n\`\`\`\n`
        : ''
      user = appendCustomInstructions(
        'Resolve git merge conflict markers in the working tree file.\n' +
          (filePath ? `File: ${filePath}\n` : '') +
          `Operation: ${op}\n` +
          (incoming ? `Incoming: ${incoming}\n` : '') +
          (branch ? `Current branch: ${branch}\n` : '') +
          baseBlock +
          sideABlock +
          sideBBlock +
          markerBlock +
          'Return ONLY JSON with this shape:\n' +
          '{\n' +
          '  "resolutions": [\n' +
          '    {\n' +
          '      "hunkId": 0,\n' +
          '      "text": "merged content without markers",\n' +
          '      "analysis": "Brief rationale for this merge decision.",\n' +
          '      "confidence": 92\n' +
          '    }\n' +
          '  ]\n' +
          '}\n' +
          'Rules:\n' +
          '- One entry per conflict hunk in order (hunkId 0, 1, 2, …)\n' +
          '- "text" is the resolved content for that hunk only (no <<<<<<< markers)\n' +
          '- "analysis" is 1-3 sentences explaining why this resolution is correct\n' +
          '- "confidence" is an integer 0-100 reflecting certainty the merge is correct\n' +
          '- Lower confidence when edits overlap, intent is ambiguous, or context is incomplete\n' +
          '- Preserve non-conflicting context; prefer minimal correct merges\n' +
          '- Combine both sides when both changes are needed',
        instructions.conflictResolve
      )
      break
    }
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
