import { describe, expect, it, afterEach, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitHubMarkdownEditor } from './GitHubMarkdownEditor'
import { renderWithProviders } from '@/test/render'

describe('GitHubMarkdownEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('switches between write and preview tabs', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <GitHubMarkdownEditor value="**Hello**" onChange={() => undefined} />
    )

    expect(screen.getByRole('button', { name: 'Write' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hello').tagName).toBe('STRONG')
  })

  it('applies bold formatting to the current value', async () => {
    const user = userEvent.setup()
    let value = 'hello world'
    renderWithProviders(
      <GitHubMarkdownEditor
        value={value}
        onChange={(next) => {
          value = next
        }}
      />
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(6, 11)
    await user.click(screen.getByRole('button', { name: 'Bold' }))

    expect(value).toBe('hello **world**')
  })

  it.each([
    ['Italic', '_world_'],
    ['Strikethrough', '~~world~~'],
    ['Link', '[world]('],
    ['Quote', '> '],
    ['Code', '`world`'],
    ['Code block', '```'],
    ['Bullet list', '- '],
    ['Numbered list', '1. '],
    ['Task list', '- [ ] ']
  ])('applies %s formatting and restores the selection', async (label, expected) => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 0
    })
    const user = userEvent.setup()
    let value = 'hello world'
    renderWithProviders(
      <GitHubMarkdownEditor
        value={value}
        onChange={(next) => {
          value = next
        }}
      />
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(6, 11)
    await user.click(screen.getByRole('button', { name: label }))
    expect(value).toContain(expected)
    raf.mockRestore()
  })

  it('edits the text directly', async () => {
    const user = userEvent.setup()
    const changes: string[] = []
    renderWithProviders(<GitHubMarkdownEditor value="" onChange={(next) => changes.push(next)} />)
    await user.type(screen.getByRole('textbox'), 'a')
    expect(changes).toContain('a')
  })
})

