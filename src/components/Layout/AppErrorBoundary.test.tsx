import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppErrorBoundary } from './AppErrorBoundary'

vi.mock('@/stores/logs', () => ({
  appLog: vi.fn()
}))

function Boom(): never {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  it('renders children when healthy', () => {
    render(
      <AppErrorBoundary>
        <div>ok</div>
      </AppErrorBoundary>
    )
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('shows a recovery UI when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload window/i })).toBeInTheDocument()
    spy.mockRestore()
  })
})
