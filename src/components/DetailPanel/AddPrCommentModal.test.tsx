import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPrCommentModal } from './AddPrCommentModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

const testRepository = { owner: 'o', repo: 'r' }

describe('AddPrCommentModal', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      prDetailNumber: null
    })
    vi.mocked(window.gitfreddo.githubPostPullRequestComment).mockResolvedValue(undefined)
  })

  it('posts a pull request conversation comment', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <AddPrCommentModal prNumber={42} repository={testRepository} open onClose={onClose} />
    )

    await user.type(screen.getByRole('textbox'), 'Looks good')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.gitfreddo.githubPostPullRequestComment).toHaveBeenCalledWith(
      '/tmp/repo',
      42,
      'Looks good',
      testRepository
    )
    expect(onClose).toHaveBeenCalled()
  })
})
