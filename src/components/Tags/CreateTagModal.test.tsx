import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTagModal } from './CreateTagModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

describe('CreateTagModal', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.get') return 'false'
      if (method === 'tag.create') return undefined
      return {}
    })
  })

  it('shows sign tag checkbox', () => {
    renderWithProviders(<CreateTagModal open onClose={() => undefined} target="abc1234" />)
    expect(screen.getByRole('checkbox', { name: /sign tag/i })).toBeInTheDocument()
  })

  it('passes sign flag when creating an annotated tag', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTagModal open onClose={() => undefined} target="abc1234" />)

    await user.type(screen.getAllByPlaceholderText('v1.0.0')[0]!, 'v1.0.0')
    await user.type(screen.getAllByPlaceholderText(/annotated tag message/i)[0]!, 'First release')
    await user.click(screen.getByRole('checkbox', { name: /sign tag/i }))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
      'tag.create',
      expect.objectContaining({ name: 'v1.0.0', sign: true })
    )
  })
})
