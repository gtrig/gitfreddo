import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurrentHeadCheck } from '@/components/Ui/CurrentHeadCheck'

describe('CurrentHeadCheck', () => {
  it('renders with a custom title', () => {
    render(<CurrentHeadCheck title="On main" />)
    expect(screen.getByTitle('On main')).toBeInTheDocument()
  })
})
