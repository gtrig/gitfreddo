/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import i18n from '@/i18n'
import { useLocale } from './useLocale'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useLocale', () => {
  beforeEach(async () => {
    window.gitfreddo = createGitFreddoMock()
    await i18n.changeLanguage('en')
  })

  it('syncs i18n language from app settings', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      locale: 'el'
    })

    renderHook(() => useLocale(), { wrapper })

    await waitFor(() => expect(i18n.language).toBe('el'))
  })

  it('leaves language unchanged when it already matches settings', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    queryClient.setQueryData(['app-settings'], {
      ...defaultMockSettings,
      locale: 'el'
    })
    await i18n.changeLanguage('el')
    const changeLanguage = vi.spyOn(i18n, 'changeLanguage')
    changeLanguage.mockClear()

    renderHook(() => useLocale(), { wrapper: localWrapper })
    await waitFor(() => expect(i18n.language).toBe('el'))

    expect(changeLanguage).not.toHaveBeenCalled()
  })
})
