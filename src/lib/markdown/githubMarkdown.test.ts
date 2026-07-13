import { describe, expect, it } from 'vitest'
import { applyGitHubMarkdownAction } from './githubMarkdown'

describe('applyGitHubMarkdownAction', () => {
  it('wraps the selection in bold markers', () => {
    const result = applyGitHubMarkdownAction('hello world', 6, 11, 'bold')
    expect(result.value).toBe('hello **world**')
    expect(result.selectionStart).toBe(8)
    expect(result.selectionEnd).toBe(13)
  })

  it('inserts placeholder text when nothing is selected', () => {
    const result = applyGitHubMarkdownAction('hello ', 6, 6, 'link')
    expect(result.value).toBe('hello [link text](url)')
  })

  it('prefixes selected lines as a quote block', () => {
    const result = applyGitHubMarkdownAction('one\ntwo', 0, 7, 'quote')
    expect(result.value).toBe('> one\n> two')
  })

  it('prefixes selected lines as a task list', () => {
    const result = applyGitHubMarkdownAction('item one\nitem two', 0, 16, 'task-list')
    expect(result.value).toBe('- [ ] item one\n- [ ] item two')
  })

  it('wraps a code block', () => {
    const result = applyGitHubMarkdownAction('const x = 1', 0, 11, 'code-block')
    expect(result.value).toBe('```\nconst x = 1\n```')
  })

  it('supports additional inline and list actions', () => {
    expect(applyGitHubMarkdownAction('text', 0, 4, 'italic').value).toBe('_text_')
    expect(applyGitHubMarkdownAction('text', 0, 4, 'strikethrough').value).toBe('~~text~~')
    expect(applyGitHubMarkdownAction('text', 0, 4, 'code').value).toBe('`text`')
    expect(applyGitHubMarkdownAction('one\ntwo', 0, 7, 'bullet-list').value).toBe('- one\n- two')
    expect(applyGitHubMarkdownAction('one\ntwo', 0, 7, 'numbered-list').value).toBe('1. one\n2. two')
  })
})
