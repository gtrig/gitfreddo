import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPrLineCommentModal } from './AddPrLineCommentModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'

const testRepository = { owner: 'o', repo: 'r' }

describe('AddPrLineCommentModal', () => {
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
    vi.mocked(window.gitfreddo.githubPostPullRequestReviewComment).mockResolvedValue(undefined)
  })

  it('posts a review comment on a specific line', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <AddPrLineCommentModal
        prNumber={42}
        repository={testRepository}
        commitId="headsha"
        path="src/a.ts"
        line={12}
        side="RIGHT"
        open
        onClose={onClose}
      />
    )

    await user.type(screen.getByRole('textbox'), 'Please rename')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.gitfreddo.githubPostPullRequestReviewComment).toHaveBeenCalledWith(
      '/tmp/repo',
      42,
      {
        body: 'Please rename',
        commitId: 'headsha',
        path: 'src/a.ts',
        line: 12,
        side: 'RIGHT'
      },
      testRepository
    )
    expect(onClose).toHaveBeenCalled()
  })
})
