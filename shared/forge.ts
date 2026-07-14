/** Cross-forge shared domain types and helpers (GitHub / GitLab / Bitbucket). */

export type ForgeProvider = 'github' | 'gitlab' | 'bitbucket'

export type ForgeMergeMethod = 'merge' | 'squash' | 'rebase'

export interface ForgeBranchRef {
  ref: string
  sha: string
}

/** Unified pull request / merge request shape. */
export interface ForgeChangeRequest {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  head: ForgeBranchRef
  base: ForgeBranchRef
  body: string
  draft: boolean
  mergeable: boolean | null
}

export interface ForgeIssue {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  body: string
  labels: string[]
}

export interface ForgeListReposParams {
  search?: string
  page?: number
}

export interface ForgeCreateChangeRequestParams {
  title: string
  head: string
  base: string
  body?: string
  draft?: boolean
}

/** Fields shared by forge repo list items. Provider identity fields (id/uuid, namespace/workspace) stay local. */
export interface ForgeRepoBase {
  fullName: string
  name: string
  owner: string
  private: boolean
  cloneUrl: string
  description: string | null
  defaultBranch: string
}

export function slugifyIssueBranch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
