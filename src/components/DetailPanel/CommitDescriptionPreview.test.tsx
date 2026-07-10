import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitDescriptionPreview } from './CommitDescriptionPreview'
import { renderWithProviders } from '@/test/render'

describe('CommitDescriptionPreview', () => {
  it('renders short descriptions without a toggle', () => {
    renderWithProviders(<CommitDescriptionPreview text="Short body." />)
    expect(screen.getByText('Short body.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
  })

  it('truncates long descriptions and toggles show more / show less', async () => {
    const user = userEvent.setup()
    const text = `${'word '.repeat(60).trim()}\n\nSecond paragraph.`
    renderWithProviders(<CommitDescriptionPreview text={text} />)

    expect(screen.getByText(/…$/)).toBeInTheDocument()
    expect(screen.queryByText(text)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show more/i }))
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Second paragraph.'))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show less/i }))
    expect(screen.getByText(/…$/)).toBeInTheDocument()
  })
})
