/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { ZoomControls } from './ZoomControls'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('ZoomControls', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders zoom controls with current level', async () => {
    renderWithProviders(<ZoomControls />)
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})
