import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpenInEditorButton } from './OpenInEditorButton'
import { renderWithProviders } from '@/test/render'

describe('OpenInEditorButton', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens the repo-relative path in the configured editor', async () => {
    const user = userEvent.setup()
    const openInEditor = vi.fn(async () => undefined)
    window.gitfreddo.openInEditor = openInEditor

    renderWithProviders(<OpenInEditorButton path="src/app.ts" />)

    await user.click(screen.getByRole('button', { name: 'Open in editor' }))
    expect(openInEditor).toHaveBeenCalledWith('src/app.ts')
  })

  it('renders nothing without a path', () => {
    renderWithProviders(<OpenInEditorButton path={null} />)
    expect(screen.queryByRole('button', { name: 'Open in editor' })).not.toBeInTheDocument()
  })
})
