/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarSection } from './SidebarSection'
import { SidebarIconBranch } from './SidebarIcons'
import { renderWithProviders } from '@/test/render'

describe('SidebarSection', () => {
  afterEach(() => cleanup())
  it('renders section title and children', () => {
    renderWithProviders(
      <SidebarSection sectionId="test" title="Branches" icon={<SidebarIconBranch />}>
        <p>Section content</p>
      </SidebarSection>
    )
    expect(screen.getByText('Branches')).toBeInTheDocument()
    expect(screen.getByText('Section content')).toBeInTheDocument()
  })
})
