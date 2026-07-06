import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiSettingsPanel } from './AiSettingsPanel'
import { defaultMockSettings } from '@/test/mocks/gitfreddo'
import { renderWithProviders } from '@/test/render'

describe('AiSettingsPanel', () => {
  afterEach(() => cleanup())

  it('hides provider settings when AI assist is disabled', () => {
    renderWithProviders(
      <AiSettingsPanel
        form={{ ...defaultMockSettings, aiEnabled: false }}
        onChange={() => undefined}
      />
    )

    expect(screen.getByLabelText(/enable ai assist/i)).not.toBeChecked()
    expect(screen.queryByText('Provider')).not.toBeInTheDocument()
  })

  it('shows provider settings when AI assist is enabled', () => {
    renderWithProviders(
      <AiSettingsPanel
        form={{ ...defaultMockSettings, aiEnabled: true }}
        onChange={() => undefined}
      />
    )

    expect(screen.getByLabelText(/enable ai assist/i)).toBeChecked()
    expect(screen.getByText('Provider')).toBeInTheDocument()
  })

  it('calls onChange when the enable switch is toggled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithProviders(
      <AiSettingsPanel
        form={{ ...defaultMockSettings, aiEnabled: false }}
        onChange={onChange}
      />
    )

    await user.click(screen.getByLabelText(/enable ai assist/i))
    expect(onChange).toHaveBeenCalledWith({ aiEnabled: true })
  })
})
