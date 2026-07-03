import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { InterfaceSettingsPanel } from './InterfaceSettingsPanel'
import { defaultMockSettings } from '@/test/mocks/gitfreddo'
import { renderWithProviders } from '@/test/render'

describe('InterfaceSettingsPanel', () => {
  it('renders language selector with current locale', () => {
    renderWithProviders(
      <InterfaceSettingsPanel form={defaultMockSettings} onChange={() => undefined} />
    )
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('en')
  })

  it('shows Greek language label when app locale is el', () => {
    renderWithProviders(
      <InterfaceSettingsPanel form={defaultMockSettings} onChange={() => undefined} />,
      { lng: 'el' }
    )
    expect(screen.getByLabelText('Γλώσσα')).toBeInTheDocument()
  })
})
