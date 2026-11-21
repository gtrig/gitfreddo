/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { TagsSection } from './TagsSection'

const tagMutations = vi.hoisted(() => ({
  checkout: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  pushTag: { mutateAsync: vi.fn(async () => undefined), isPending: false }
}))
vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => tagMutations
}))

function dialogMock(title: string) {
  return ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog">
        {title}
        <button type="button" onClick={onClose}>
          Close {title}
        </button>
      </div>
    ) : null
}
vi.mock('@/components/Tags/CreateTagModal', () => ({ CreateTagModal: dialogMock('Create tag') }))
vi.mock('@/components/Tags/RenameTagModal', () => ({ RenameTagModal: dialogMock('Rename tag') }))
vi.mock('@/components/Tags/DeleteTagModal', () => ({ DeleteTagModal: dialogMock('Delete tag') }))
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

describe('TagsSection', () => {
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
  it('renders section content', () => {
    renderWithProviders(<TagsSection tags={[{ name: "v1.0.0", target: "abc", isAnnotated: false, isRemote: false }]} remotes={[]} filter="" isLoading={false} error={null} onSelectCommit={vi.fn()} />)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('filters tags by name', () => {
    renderWithProviders(
      <TagsSection
        tags={[
          { name: 'v1.0.0', target: 'abc', isAnnotated: false, isRemote: false },
          { name: 'v2.0.0', target: 'def', isAnnotated: false, isRemote: false }
        ]}
        remotes={[]}
        filter="v2"
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('v2.0.0')).toBeInTheDocument()
    expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
  })

  it('shows loading and error states', () => {
    const { rerender } = renderWithProviders(
      <TagsSection
        tags={[]}
        remotes={[]}
        filter=""
        isLoading
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <TagsSection
        tags={[]}
        remotes={[]}
        filter=""
        isLoading={false}
        error={new Error('Failed to load tags')}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('Failed to load tags')).toBeInTheDocument()
  })

  it('shows empty state and opens create tag modal', async () => {
    renderWithProviders(
      <TagsSection tags={[]} remotes={[]} filter="" isLoading={false} error={null} onSelectCommit={vi.fn()} />
    )
    expect(screen.getByText(/no tags/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /create tag/i }))
    expect(screen.getByText('Create tag')).toBeInTheDocument()
  })

  it('selects commit and opens tag context menu', async () => {
    const onSelectCommit = vi.fn()
    renderWithProviders(
      <TagsSection
        tags={[{ name: 'v1.0.0', target: 'abc', isAnnotated: false, isRemote: false }]}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={onSelectCommit}
      />
    )

    await userEvent.click(screen.getByText('v1.0.0'))
    expect(onSelectCommit).toHaveBeenCalledWith('abc')

    fireEvent.contextMenu(screen.getByText('v1.0.0'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('virtualizes large tag lists', () => {
    const tags = Array.from({ length: 55 }, (_, index) => ({
      name: `v${index}.0.0`,
      target: `${index}`.padStart(40, '0'),
      isAnnotated: false,
      isRemote: false
    }))

    renderWithProviders(
      <TagsSection tags={tags} remotes={[]} filter="" isLoading={false} error={null} onSelectCommit={vi.fn()} />
    )
    expect(screen.getByText('v0.0.0')).toBeInTheDocument()
    expect(screen.getByText('v54.0.0')).toBeInTheDocument()
  })

  describe.each([
    ['a short list', 1],
    ['a virtualized list', 55]
  ])('tag actions in %s', (_label, count) => {
    it('checks out, pushes, renames and deletes a tag', async () => {
      tagMutations.checkout.mutateAsync.mockClear()
      tagMutations.pushTag.mutateAsync.mockClear()
      const tags = [
        { name: 'v1.0.0', target: 'abc', isAnnotated: false, isRemote: false },
        ...Array.from({ length: count - 1 }, (_, index) => ({
          name: `v0.${index}.0`,
          target: `${index}`.padStart(40, '0'),
          isAnnotated: false,
          isRemote: false
        }))
      ]
      const onSelectCommit = vi.fn()
      renderWithProviders(
        <TagsSection
          tags={tags}
          remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
          filter=""
          isLoading={false}
          error={null}
          onSelectCommit={onSelectCommit}
        />
      )
      const row = () => screen.getByText('v1.0.0')
      const menu = async (item: RegExp) => {
        fireEvent.contextMenu(row())
        await userEvent.click(screen.getByRole('menuitem', { name: item }))
      }

      await userEvent.click(row())
      expect(onSelectCommit).toHaveBeenCalledWith('abc')
      await userEvent.dblClick(row())
      expect(tagMutations.checkout.mutateAsync).toHaveBeenCalled()

      await menu(/^checkout v1\.0\.0/i)
      expect(tagMutations.checkout.mutateAsync).toHaveBeenCalledTimes(2)
      await menu(/^push to/i)
      expect(tagMutations.pushTag.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'v1.0.0' })
      )
      await menu(/^rename/i)
      await userEvent.click(screen.getByRole('button', { name: 'Close Rename tag' }))
      await menu(/^delete tag/i)
      await userEvent.click(screen.getByRole('button', { name: 'Close Delete tag' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes the create tag dialog', async () => {
    renderWithProviders(
      <TagsSection tags={[]} remotes={[]} filter="" isLoading={false} error={null} onSelectCommit={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: /create tag/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Close Create tag' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

