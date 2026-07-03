import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { PushForceConfirm } from '@/components/Layout/PushForceConfirm'
import { renderWithProviders } from '@/test/render'

describe('PushForceConfirm', () => {
  it('renders nothing without params', () => {
    const { container } = renderWithProviders(
      <PushForceConfirm params={null} onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
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
