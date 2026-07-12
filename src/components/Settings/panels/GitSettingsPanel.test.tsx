/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { GitSettingsPanel } from './GitSettingsPanel'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

describe('GitSettingsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders git binary path field', () => {
    renderWithProviders(
      <GitSettingsPanel
        form={defaultMockSettings}
        onChange={vi.fn()}
        onPickGit={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('git')).toBeInTheDocument()
  })
})
