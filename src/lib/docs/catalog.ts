export interface DocPageRef {
  path: string
}

export interface DocSection {
  id: string
  titleKey: string
  pages: DocPageRef[]
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'start',
    titleKey: 'docs.sections.start',
    pages: [
      { path: 'README.md' },
      { path: 'getting-started.md' },
      { path: 'architecture.md' }
    ]
  },
  {
    id: 'setup',
    titleKey: 'docs.sections.setup',
    pages: [
      { path: 'setup/github.md' },
      { path: 'setup/ai-assistant.md' },
      { path: 'setup/git-and-credentials.md' },
      { path: 'setup/interface-and-themes.md' }
    ]
  },
  {
    id: 'workflows',
    titleKey: 'docs.sections.workflows',
    pages: [
      { path: 'workflows/01-everyday.md' },
      { path: 'workflows/02-branching-and-merging.md' },
      { path: 'workflows/03-remotes-and-sync.md' },
      { path: 'workflows/04-stash-and-cleanup.md' },
      { path: 'workflows/05-history-rewriting.md' },
      { path: 'workflows/06-worktrees.md' },
      { path: 'workflows/07-inspection-tools.md' },
      { path: 'workflows/08-conflicts.md' }
    ]
  },
  {
    id: 'contributing',
    titleKey: 'docs.sections.contributing',
    pages: [
      { path: 'contributing/contributing.md' },
      { path: 'contributing/testing.md' },
      { path: 'contributing/i18n.md' }
    ]
  },
  {
    id: 'product',
    titleKey: 'docs.sections.product',
    pages: [{ path: 'roadmap.md' }, { path: 'CHANGELOG.md' }]
  }
]

export const DEFAULT_DOC_PATH = 'README.md'

export const DOC_PATH_KEY = 'gitfreddo:docs-path'

export function isKnownDocPath(path: string): boolean {
  return DOC_SECTIONS.some((section) => section.pages.some((page) => page.path === path))
}

export function loadDocPath(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_DOC_PATH
  const stored = localStorage.getItem(DOC_PATH_KEY)
  if (stored && isKnownDocPath(stored)) return stored
  return DEFAULT_DOC_PATH
}

export function saveDocPath(path: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DOC_PATH_KEY, path)
}
