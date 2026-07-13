/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoPicker } from './RepoPicker'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn()
}))

vi.mock('@/hooks/useBitbucketRepos', () => ({
  useBitbucketRepos: vi.fn()
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

import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useBitbucketRepos } from '@/hooks/useBitbucketRepos'

describe('Bitbucket RepoPicker', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: [
        {
          uuid: 'repo-1',
          fullName: 'ws/alpha',
          name: 'alpha',
          slug: 'alpha',
          workspace: 'ws',
          cloneUrl: 'https://bitbucket.org/ws/alpha.git',
          cloneUrlHttps: 'https://bitbucket.org/ws/alpha.git',
          cloneUrlSsh: 'git@bitbucket.org:ws/alpha.git',
          isPrivate: false
        }
      ],
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when Bitbucket is not linked', () => {
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/Connect Bitbucket in Settings/i)).toBeInTheDocument()
  })

  it('filters repositories and selects one', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={onSelect} />)

    expect(screen.getByText('ws/alpha')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'alpha')

    await waitFor(() => {
      expect(useBitbucketRepos).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'alpha' }),
        true
      )
    })

    await userEvent.click(screen.getByText('ws/alpha'))
    expect(onSelect).toHaveBeenCalledWith({
      fullName: 'ws/alpha',
      cloneUrl: 'https://bitbucket.org/ws/alpha.git'
    })
  })

  it('shows loading state', () => {
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: [],
      isLoading: true,
      error: null
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/loading repositories/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('API failed')
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText('API failed')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/No repositories found/i)).toBeInTheDocument()
  })

  it('highlights the selected repository and shows metadata', async () => {
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: [
        {
          uuid: 'repo-1',
          fullName: 'ws/alpha',
          name: 'alpha',
          slug: 'alpha',
          workspace: 'ws',
          cloneUrl: 'https://bitbucket.org/ws/alpha.git',
          cloneUrlHttps: 'https://bitbucket.org/ws/alpha.git',
          cloneUrlSsh: 'git@bitbucket.org:ws/alpha.git',
          isPrivate: true,
          description: 'Primary app',
          private: true
        }
      ],
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(
      <RepoPicker selectedFullName="ws/alpha" onSelect={vi.fn()} compact />
    )

    expect(screen.getByText('Primary app')).toBeInTheDocument()
    expect(screen.getByText(/private/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ws\/alpha/i })).toHaveClass('bg-gf-accent/10')
  })

  it('virtualizes long repository lists', () => {
    vi.mocked(useBitbucketRepos).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => ({
        uuid: `repo-${index}`,
        fullName: `ws/repo-${index}`,
        name: `repo-${index}`,
        slug: `repo-${index}`,
        workspace: 'ws',
        cloneUrl: `https://bitbucket.org/ws/repo-${index}.git`,
        cloneUrlHttps: `https://bitbucket.org/ws/repo-${index}.git`,
        cloneUrlSsh: `git@bitbucket.org:ws/repo-${index}.git`,
        isPrivate: false,
        private: false
      })),
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText('ws/repo-0')).toBeInTheDocument()
    expect(screen.getByText('ws/repo-54')).toBeInTheDocument()
  })
})
