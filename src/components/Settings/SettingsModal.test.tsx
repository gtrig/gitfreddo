import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from './SettingsModal'
import { defaultMockSettings } from '@/test/mocks/gitfreddo'
import { renderWithProviders } from '@/test/render'
import { THEME_STORAGE_KEY } from '@/lib/themes'

describe('SettingsModal theme preview', () => {
  beforeEach(() => {
    localStorage.setItem('gitfreddo:settings-section', 'interface')
    document.documentElement.dataset.theme = 'black'
    localStorage.setItem(THEME_STORAGE_KEY, 'black')
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      theme: 'black'
    })
    vi.mocked(window.gitfreddo.setSettings).mockImplementation(async (patch) => ({
      ...defaultMockSettings,
      ...patch
    }))
  })

  afterEach(() => {
    cleanup()
    vi.mocked(window.gitfreddo.getSettings).mockReset()
    vi.mocked(window.gitfreddo.setSettings).mockReset()
  })

  it('previews the selected theme before save', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsModal open onClose={() => undefined} />)

    const themeSelect = await screen.findByLabelText('Theme')
    await user.selectOptions(themeSelect, 'freddo')

    expect(document.documentElement.dataset.theme).toBe('freddo')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('black')
    expect(window.gitfreddo.setSettings).not.toHaveBeenCalled()
  })

  it('reverts the preview when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<SettingsModal open onClose={onClose} />)

    const themeSelect = await screen.findByLabelText('Theme')
    await user.selectOptions(themeSelect, 'freddo')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(document.documentElement.dataset.theme).toBe('black')
    expect(window.gitfreddo.setSettings).not.toHaveBeenCalled()
  })

  it('keeps the previewed theme after save', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<SettingsModal open onClose={onClose} />)

    const themeSelect = await screen.findByLabelText('Theme')
    await user.selectOptions(themeSelect, 'freddo')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(document.documentElement.dataset.theme).toBe('freddo')
    expect(window.gitfreddo.setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'freddo' })
    )
  })
})
