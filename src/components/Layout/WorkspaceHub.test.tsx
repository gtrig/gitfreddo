/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { WorkspaceHub } from './WorkspaceHub'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('WorkspaceHub', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getRecentRepos).mockResolvedValue(['/tmp/recent-repo'])
  })

  it('renders open-repo action cards on page variant', () => {
    renderWithProviders(
      <WorkspaceHub variant="page" onOpen={async () => undefined} />
    )
    expect(screen.getByText('Open a folder')).toBeInTheDocument()
    expect(screen.getByText('Initialize a new repository')).toBeInTheDocument()
    expect(screen.getByText('Clone a repository')).toBeInTheDocument()
    expect(screen.getByText('Create on GitHub')).toBeInTheDocument()
  })

  it('renders modal variant with close action', () => {
    renderWithProviders(
      <WorkspaceHub variant="modal" open onOpen={async () => undefined} onClose={() => undefined} />
    )
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})
