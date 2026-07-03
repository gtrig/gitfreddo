import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { WorkspaceHub } from './WorkspaceHub'
import { renderWithProviders } from '@/test/render'

describe('WorkspaceHub', () => {
  it('renders open-repo action cards on page variant', () => {
    renderWithProviders(
      <WorkspaceHub variant="page" onOpen={async () => undefined} />
    )
    expect(screen.getByText('Open a folder')).toBeInTheDocument()
    expect(screen.getByText('Initialize a new repository')).toBeInTheDocument()
    expect(screen.getByText('Clone a repository')).toBeInTheDocument()
    expect(screen.getByText('Create on GitHub')).toBeInTheDocument()
  })
})
