/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoPicker } from './RepoPicker'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useGitlabStatus', () => ({
  useGitlabStatus: vi.fn()
}))

vi.mock('@/hooks/useGitlabRepos', () => ({
  useGitlabRepos: vi.fn()
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

import { useGitlabStatus } from '@/hooks/useGitlabStatus'
import { useGitlabRepos } from '@/hooks/useGitlabRepos'

describe('GitLab RepoPicker', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: [
        {
          id: 1,
          fullName: 'ns/alpha',
          name: 'alpha',
          namespace: 'ns',
          cloneUrl: 'https://gitlab.com/ns/alpha.git',
          private: false
        }
      ],
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when GitLab is not linked', () => {
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/Connect GitLab in Settings/i)).toBeInTheDocument()
  })

  it('filters repositories and selects one', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={onSelect} />)

    expect(screen.getByText('ns/alpha')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'alpha')

    await waitFor(() => {
      expect(useGitlabRepos).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'alpha' }),
        true
      )
    })

    await userEvent.click(screen.getByText('ns/alpha'))
    expect(onSelect).toHaveBeenCalledWith({
      fullName: 'ns/alpha',
      cloneUrl: 'https://gitlab.com/ns/alpha.git'
    })
  })

  it('shows loading state', () => {
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: [],
      isLoading: true,
      error: null
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/loading repositories/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('API failed')
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText('API failed')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    } as never)
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/No repositories found/i)).toBeInTheDocument()
  })

  it('highlights the selected repository and shows metadata', async () => {
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: [
        {
          id: 1,
          fullName: 'ns/alpha',
          name: 'alpha',
          namespace: 'ns',
          cloneUrl: 'https://gitlab.com/ns/alpha.git',
          description: 'Primary app',
          private: true
        }
      ],
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(
      <RepoPicker selectedFullName="ns/alpha" onSelect={vi.fn()} compact />
    )

    expect(screen.getByText('Primary app')).toBeInTheDocument()
    expect(screen.getByText(/private/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ns\/alpha/i })).toHaveClass('bg-gf-accent/10')
  })

  it('virtualizes long repository lists', () => {
    vi.mocked(useGitlabRepos).mockReturnValue({
      data: Array.from({ length: 55 }, (_, index) => ({
        id: index,
        fullName: `ns/repo-${index}`,
        name: `repo-${index}`,
        namespace: 'ns',
        cloneUrl: `https://gitlab.com/ns/repo-${index}.git`,
        private: false
      })),
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText('ns/repo-0')).toBeInTheDocument()
    expect(screen.getByText('ns/repo-54')).toBeInTheDocument()
  })
})
