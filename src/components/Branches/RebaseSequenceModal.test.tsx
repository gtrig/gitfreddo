/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RebaseSequenceModal } from './RebaseSequenceModal'
import { renderWithProviders } from '@/test/render'
import { useToastStore } from '@/stores/toast'
import { makeCommit } from '@/test/fixtures/commit'

const rebaseInteractiveMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    rebaseInteractive: { mutateAsync: rebaseInteractiveMutate, isPending: false }
  })
}))

const firstCommit = makeCommit({
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  shortHash: 'abc1234',
  parents: ['0000000000000000000000000000000000000000'],
  subject: 'First',
  message: 'First'
})

const mergeCommit = makeCommit({
  hash: 'def4567890123456789012345678901234567890',
  shortHash: 'def4567',
  parents: [
    'abc1234567890abcdef1234567890abcdef123456',
    'fedcba0987654321fedcba0987654321fedcba09'
  ],
  subject: 'Merge branch',
  message: 'Merge branch'
})

describe('RebaseSequenceModal', () => {
  afterEach(() => {
    cleanup()
    rebaseInteractiveMutate.mockClear()
  })

  beforeEach(() => {
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
  })

  it('renders interactive rebase title', () => {
    renderWithProviders(<RebaseSequenceModal open commits={[firstCommit]} onClose={() => undefined} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/interactive rebase/i)).toBeInTheDocument()
  })

  it('warns when the sequence includes merge commits', () => {
    renderWithProviders(
      <RebaseSequenceModal open commits={[firstCommit, mergeCommit]} onClose={() => undefined} />
    )
    expect(screen.getByText(/merge commit/i)).toBeInTheDocument()
  })

  it('starts interactive rebase with edited todo lines', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RebaseSequenceModal open commits={[firstCommit]} onClose={onClose} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'reword abc1234567890abcdef1234567890abcdef123456 First')
    await user.click(screen.getByRole('button', { name: /start rebase/i }))

    await waitFor(() => {
      expect(rebaseInteractiveMutate).toHaveBeenCalledWith({
        baseHash: 'abc1234567890abcdef1234567890abcdef123456',
        todoLines: ['reword abc1234567890abcdef1234567890abcdef123456 First']
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows an error toast when rebase start fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    rebaseInteractiveMutate.mockRejectedValueOnce(new Error('rebase failed'))
    const user = userEvent.setup()
    renderWithProviders(<RebaseSequenceModal open commits={[firstCommit]} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /start rebase/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('rebase failed', 'error')
    })
  })

  it('applies bulk action to all todo lines', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <RebaseSequenceModal open commits={[firstCommit, mergeCommit]} onClose={vi.fn()} />
    )

    const squashSelect = screen.getAllByRole('combobox')[3]!
    await user.selectOptions(squashSelect, 'squash')
    const value = (screen.getByRole('textbox') as HTMLTextAreaElement).value
    expect(value).toContain('squash abc1234567890abcdef1234567890abcdef123456')
    expect(value).toContain('squash def4567890123456789012345678901234567890')
  })
})
