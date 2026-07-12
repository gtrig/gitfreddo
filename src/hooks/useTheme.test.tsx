/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTheme } from './useTheme'
import { THEME_STORAGE_KEY } from '@/lib/themes'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useTheme', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('applies the theme from app settings to the document', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      theme: 'freddo'
    })

    renderHook(() => useTheme(), { wrapper })

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('freddo')
    })
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('freddo')
  })

  it('updates the document theme when settings change', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    queryClient.setQueryData(['app-settings'], {
      ...defaultMockSettings,
      theme: 'black'
    })

    renderHook(() => useTheme(), { wrapper: localWrapper })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('black'))

    queryClient.setQueryData(['app-settings'], {
      ...defaultMockSettings,
      theme: 'matcha'
    })

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('matcha'))
  })
})
