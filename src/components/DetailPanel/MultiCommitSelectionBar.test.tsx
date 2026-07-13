/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiCommitSelectionBar } from './MultiCommitSelectionBar'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'

vi.mock('@/components/DetailPanel/ExplainCommitWithAi', () => ({
  ExplainCommitButton: () => <button type="button">Explain</button>
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn()
  }))
}))

const parent = makeCommit({
  hash: 'aaa111111111111111111111111111111111111',
  shortHash: 'aaa1111',
  subject: 'First',
  refs: ['main']
})

const child = makeCommit({
  hash: 'bbb222222222222222222222222222222222222',
  shortHash: 'bbb2222',
  parents: [parent.hash],
  subject: 'Second',
  refs: []
})

const allCommits = [child, parent]

function renderBar(overrides: Partial<Parameters<typeof MultiCommitSelectionBar>[0]> = {}) {
  const onSelectPrimary = vi.fn()
  const onCopyAllHashes = vi.fn()
  const onCompare = vi.fn()
  const onCherryPickAll = vi.fn()
  const onSquash = vi.fn()

  renderWithProviders(
    <MultiCommitSelectionBar
      commits={[parent, child]}
      allCommits={allCommits}
      primaryHash={parent.hash}
      head={child.hash}
      branch="main"
      isDetached={false}
      isClean
      gitBusy={false}
      onSelectPrimary={onSelectPrimary}
      onCopyAllHashes={onCopyAllHashes}
      onCompare={onCompare}
      onCherryPickAll={onCherryPickAll}
      onSquash={onSquash}
      {...overrides}
    />
  )

  return { onSelectPrimary, onCopyAllHashes, onCompare, onCherryPickAll, onSquash }
}

describe('MultiCommitSelectionBar', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders selected commit count', () => {
    renderBar()
    expect(screen.getByText(/2 commits selected/i)).toBeInTheDocument()
  })

  it('copies all selected hashes', async () => {
    const { onCopyAllHashes } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /copy hashes/i }))
    expect(onCopyAllHashes).toHaveBeenCalledWith([parent.hash, child.hash])
  })

  it('compares oldest and newest selected commits', async () => {
    const { onCompare } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /^compare$/i }))
    expect(onCompare).toHaveBeenCalledWith(
      parent.hash,
      child.hash,
      expect.stringMatching(/aaa1111.*bbb2222/)
    )
  })

  it('squashes contiguous commits on the current branch', async () => {
    const { onSquash } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /^squash$/i }))
    expect(onSquash).toHaveBeenCalledWith([parent.hash, child.hash])
  })

  it('disables cherry-pick when selected commits are already on branch history', () => {
    renderBar()
    expect(screen.getByRole('button', { name: /cherry-pick all/i })).toBeDisabled()
  })

  it('disables squash when selection is not on branch history', () => {
    renderBar({ head: 'ccc333333333333333333333333333333333333' })
    expect(screen.getByRole('button', { name: /^squash$/i })).toBeDisabled()
  })

  it('disables cherry-pick when working tree is dirty', () => {
    renderBar({ isClean: false })
    expect(screen.getByRole('button', { name: /cherry-pick all/i })).toBeDisabled()
  })

  it('selects a new primary commit from the list', async () => {
    const { onSelectPrimary } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /bbb2222/i }))
    expect(onSelectPrimary).toHaveBeenCalledWith(child.hash)
  })

  it('virtualizes large multi-selection lists', () => {
    const many = Array.from({ length: 55 }, (_, index) =>
      makeCommit({
        hash: `${index}`.padStart(40, '0'),
        shortHash: `${index}`.padStart(7, '0'),
        subject: `Commit ${index}`,
        parents: index === 0 ? [] : [`${index - 1}`.padStart(40, '0')]
      })
    )
    renderWithProviders(
      <MultiCommitSelectionBar
        commits={many}
        allCommits={many}
        primaryHash={many[0]!.hash}
        head={many[0]!.hash}
        branch="main"
        isDetached={false}
        isClean
        gitBusy={false}
        onSelectPrimary={vi.fn()}
        onCopyAllHashes={vi.fn()}
        onCompare={vi.fn()}
        onCherryPickAll={vi.fn()}
        onSquash={vi.fn()}
      />
    )
    expect(screen.getByText(/55 commits selected/i)).toBeInTheDocument()
    expect(screen.getByText('Commit 54')).toBeInTheDocument()
  })
})
