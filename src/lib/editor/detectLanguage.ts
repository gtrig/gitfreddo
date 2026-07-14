export type CodeLanguage =
  | 'javascript'
  | 'json'
  | 'html'
  | 'css'
  | 'python'
  | 'markdown'
  | 'xml'
  | 'shell'
  | 'plaintext'

const EXTENSION_LANGUAGE: Record<string, CodeLanguage> = {
  ts: 'javascript',
  tsx: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  py: 'python',
  md: 'markdown',
  markdown: 'markdown',
  xml: 'xml',
  svg: 'xml',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell'
}

const BASENAME_LANGUAGE: Record<string, CodeLanguage> = {
  '.gitignore': 'plaintext',
  '.gitattributes': 'plaintext',
  '.gitmodules': 'plaintext'
}

const GIT_HOOK_NAMES = new Set([
  'applypatch-msg',
  'commit-msg',
  'fsmonitor-watchtree',
  'post-checkout',
  'post-commit',
  'post-merge',
  'post-receive',
  'post-rewrite',
  'post-update',
  'pre-applypatch',
  'pre-auto-gc',
  'pre-commit',
  'pre-merge-commit',
  'pre-push',
  'pre-rebase',
  'pre-receive',
  'prepare-commit-msg',
  'push-to-checkout',
  'sendemail-validate',
  'update'
])

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] ?? path
}

function stripSampleSuffix(name: string): string {
  return name.endsWith('.sample') ? name.slice(0, -'.sample'.length) : name
}

export function detectLanguage(path: string | undefined): CodeLanguage {
  if (!path) return 'plaintext'

  const name = basename(path)
  if (!name) return 'plaintext'

  const knownBasename = BASENAME_LANGUAGE[name]
  if (knownBasename) return knownBasename

  const hookName = stripSampleSuffix(name)
  if (GIT_HOOK_NAMES.has(hookName)) return 'shell'

  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return 'plaintext'

  const ext = name.slice(dot + 1).toLowerCase()
  return EXTENSION_LANGUAGE[ext] ?? 'plaintext'
}
