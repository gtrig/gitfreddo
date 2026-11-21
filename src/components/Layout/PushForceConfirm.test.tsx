import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { PushForceConfirm } from '@/components/Layout/PushForceConfirm'
import { renderWithProviders } from '@/test/render'

describe('PushForceConfirm', () => {
  afterEach(() => cleanup())

  it('renders nothing without params', () => {
    const { container } = renderWithProviders(
      <PushForceConfirm params={null} onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('reads naturally when the branch and remote are not known', () => {
    renderWithProviders(
      <PushForceConfirm params={{}} onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(
      screen.getByText(
        'The remote has commits that are not in your local branch. Force pushing will overwrite the remote with your local branch.'
      )
    ).toBeInTheDocument()
  })

  it('names the remote when only the branch is unknown', () => {
    renderWithProviders(
      <PushForceConfirm params={{ remote: 'backup' }} onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(
      screen.getByText(/not in your local branch\. Force pushing will overwrite backup/)
    ).toBeInTheDocument()
  })

  it('names the branch and remote when known', () => {
    renderWithProviders(
      <PushForceConfirm
        params={{ remote: 'backup', branch: 'main' }}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(
      screen.getByText(/not in your local main\. Force pushing will overwrite backup/)
    ).toBeInTheDocument()
  })

  it('confirms force push', () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <PushForceConfirm
        params={{ remote: 'origin', branch: 'main', force: true }}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /force push/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
