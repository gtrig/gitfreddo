/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { AiPromptChat } from './AiPromptChat'
import { renderWithProviders } from '@/test/render'

const labels = {
  title: 'AI chat',
  hint: 'Ask a question',
  emptyMessage: 'No messages yet',
  placeholder: 'Type a message',
  sendLabel: 'Send',
  youLabel: 'You',
  assistantLabel: 'Assistant',
  thinkingLabel: 'Thinking…'
}

describe('AiPromptChat', () => {
  afterEach(() => cleanup())
  it('renders chat input', () => {
    renderWithProviders(
      <AiPromptChat
        labels={labels}
        messages={[]}
        input=""
        busy={false}
        onInputChange={vi.fn()}
        onSend={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText('Type a message')).toBeInTheDocument()
  })
})
