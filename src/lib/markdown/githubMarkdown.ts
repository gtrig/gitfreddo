export type GitHubMarkdownAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'quote'
  | 'code'
  | 'code-block'
  | 'link'
  | 'bullet-list'
  | 'numbered-list'
  | 'task-list'

export interface MarkdownSelection {
  value: string
  selectionStart: number
  selectionEnd: number
}

function clampSelection(value: string, start: number, end: number) {
  const selectionStart = Math.max(0, Math.min(start, value.length))
  const selectionEnd = Math.max(selectionStart, Math.min(end, value.length))
  return { selectionStart, selectionEnd }
}

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder: string
): MarkdownSelection {
  const { selectionStart: start, selectionEnd: end } = clampSelection(value, selectionStart, selectionEnd)
  const selected = value.slice(start, end) || placeholder
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
  const nextStart = start + before.length
  const nextEnd = nextStart + selected.length
  return { value: nextValue, selectionStart: nextStart, selectionEnd: nextEnd }
}

function selectedLineRange(value: string, selectionStart: number, selectionEnd: number) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
  const lineEndIndex = value.indexOf('\n', selectionEnd)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  return { lineStart, lineEnd }
}

function prefixLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  ordered = false
): MarkdownSelection {
  const { lineStart, lineEnd } = selectedLineRange(value, selectionStart, selectionEnd)
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const prefixed = lines
    .map((line, index) => {
      const trimmed = line.trimStart()
      const leading = line.slice(0, line.length - trimmed.length)
      if (!trimmed) return line
      if (ordered) {
        return `${leading}${index + 1}. ${trimmed}`
      }
      return `${leading}${prefix}${trimmed}`
    })
    .join('\n')

  const nextValue = `${value.slice(0, lineStart)}${prefixed}${value.slice(lineEnd)}`
  const delta = prefixed.length - block.length
  return {
    value: nextValue,
    selectionStart: selectionStart,
    selectionEnd: selectionEnd + delta
  }
}

export function applyGitHubMarkdownAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: GitHubMarkdownAction
): MarkdownSelection {
  switch (action) {
    case 'bold':
      return wrapSelection(value, selectionStart, selectionEnd, '**', '**', 'bold text')
    case 'italic':
      return wrapSelection(value, selectionStart, selectionEnd, '_', '_', 'italic text')
    case 'strikethrough':
      return wrapSelection(value, selectionStart, selectionEnd, '~~', '~~', 'strikethrough')
    case 'code':
      return wrapSelection(value, selectionStart, selectionEnd, '`', '`', 'code')
    case 'code-block': {
      const wrapped = wrapSelection(value, selectionStart, selectionEnd, '```\n', '\n```', 'code')
      return wrapped
    }
    case 'link':
      return wrapSelection(value, selectionStart, selectionEnd, '[', '](url)', 'link text')
    case 'quote':
      return prefixLines(value, selectionStart, selectionEnd, '> ')
    case 'bullet-list':
      return prefixLines(value, selectionStart, selectionEnd, '- ')
    case 'numbered-list':
      return prefixLines(value, selectionStart, selectionEnd, '', true)
    case 'task-list':
      return prefixLines(value, selectionStart, selectionEnd, '- [ ] ')
    default: {
      const selection = clampSelection(value, selectionStart, selectionEnd)
      return { value, ...selection }
    }
  }
}
