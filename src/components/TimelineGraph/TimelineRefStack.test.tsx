/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineRefStack } from './TimelineRefStack'

describe('TimelineRefStack', () => {
  it('renders branch ref badges', () => {
    render(
      <TimelineRefStack
        refs={[
          {
            kind: 'branch',
            label: 'main',
            fullRef: 'refs/heads/main',
            sourceOrder: 0
          }
        ]}
        isHeadCommit
        currentBranch="main"
        isDetached={false}
      />
    )
    expect(screen.getByText('main')).toBeInTheDocument()
  })
})
