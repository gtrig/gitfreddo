/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoPicker } from './RepoPicker'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn()
}))

vi.mock('@/hooks/useGitHubRepos', () => ({
  useGitHubRepos: vi.fn()
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

import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useGitHubRepos } from '@/hooks/useGitHubRepos'

describe('GitHub RepoPicker', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
    vi.mocked(useGitHubRepos).mockReturnValue({
      data: [
        {
          id: 1,
          fullName: 'org/alpha',
          name: 'alpha',
          cloneUrl: 'https://github.com/org/alpha.git',
          private: false
        }
      ],
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when GitHub is not linked', () => {
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/Connect GitHub in Settings/i)).toBeInTheDocument()
  })

  it('selects a repository from the list', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<RepoPicker selectedFullName={null} onSelect={onSelect} />)

    expect(screen.getByText('org/alpha')).toBeInTheDocument()
    await userEvent.click(screen.getByText('org/alpha'))
    expect(onSelect).toHaveBeenCalledWith({
      fullName: 'org/alpha',
      cloneUrl: 'https://github.com/org/alpha.git'
    })
  })
})
