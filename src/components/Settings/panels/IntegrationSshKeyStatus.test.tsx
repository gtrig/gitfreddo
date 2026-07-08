import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { IntegrationSshKeyStatus } from '@/components/Settings/panels/IntegrationSshKeyStatus'
import { renderWithProviders } from '@/test/render'

describe('IntegrationSshKeyStatus', () => {
  it('shows the ssh key identifier when a key is active', () => {
    renderWithProviders(
      <IntegrationSshKeyStatus
        sshKeyTitle="GitFreddo 2026-07-08T06:00:00.000Z"
        namespace="github"
      />
    )

    expect(screen.getByText('SSH key active')).toBeInTheDocument()
    expect(screen.getByText('GitFreddo 2026-07-08T06:00:00.000Z')).toBeInTheDocument()
  })

  it('shows a missing state when no ssh key is present', () => {
    renderWithProviders(<IntegrationSshKeyStatus sshKeyTitle={null} namespace="bitbucket" />)

    expect(screen.getByText('No GitFreddo SSH key found on this account.')).toBeInTheDocument()
  })
})
