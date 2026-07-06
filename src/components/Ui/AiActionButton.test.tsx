import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AiActionButton } from './AiActionButton'

describe('AiActionButton', () => {
  it('renders sparkles icon and label for toolbar variant', () => {
    render(<AiActionButton>Explain</AiActionButton>)
    expect(screen.getByRole('button', { name: /explain/i })).toBeInTheDocument()
  })

  it('renders icon-only for icon variant', () => {
    render(
      <AiActionButton variant="icon" aria-label="Fill summary" />
    )
    const button = screen.getByRole('button', { name: /fill summary/i })
    expect(button).toHaveClass('h-5', 'w-5')
    expect(button.textContent).toBe('')
  })

  it('shows spinner when loading', () => {
    render(<AiActionButton loading>Explain</AiActionButton>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
