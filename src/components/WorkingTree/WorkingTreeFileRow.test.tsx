/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  WorkingTreeActionButton,
  actionVariantStyles,
  fileStatusBadge,
  FileChangePath,
  toCommitKind,
  toTreeItems,
  fileNameFromPath,
  FolderCounts,
  FileRow,
  TreeNode
} from './WorkingTreeFileRow'
import type { GitFileChange } from '@/lib/types'

describe('WorkingTreeActionButton', () => {
  it('exposes action variant styles for each mode', () => {
    expect(actionVariantStyles.stage).toContain('emerald')
    expect(actionVariantStyles.unstage).toContain('amber')
    expect(actionVariantStyles.clear).toContain('rose')
  })

  it('renders stage action and handles click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <WorkingTreeActionButton variant="stage" label="Stage" onClick={onClick} />
    )
    await user.click(screen.getByRole('button', { name: 'Stage' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('disables the button while loading', () => {
    render(
      <WorkingTreeActionButton variant="unstage" label="Unstage" onClick={vi.fn()} loading />
    )
    expect(screen.getByRole('button', { name: 'Unstage' })).toBeDisabled()
  })
})

describe('fileStatusBadge', () => {
  it('returns submodule status when present', () => {
    const file = {
      path: 'sub',
      status: 'modified',
      isSubmodule: true,
      submoduleStatus: 'dirty'
    } as GitFileChange
    expect(fileStatusBadge(file).label).toBe('S~')
  })

  it('returns file status for regular changes', () => {
    const file = { path: 'a.txt', status: 'added' } as GitFileChange
    expect(fileStatusBadge(file).label).toBe('A')
  })
})

describe('FileChangePath', () => {
  it('shows rename arrow for renamed files', () => {
    render(
      <FileChangePath
        file={{ path: 'new.txt', oldPath: 'old.txt', status: 'renamed' } as GitFileChange}
      />
    )
    expect(screen.getByText('old.txt')).toBeInTheDocument()
    expect(screen.getByText('new.txt')).toBeInTheDocument()
  })
})

describe('working tree helpers', () => {
  it('maps git statuses to commit kinds', () => {
    expect(toCommitKind('added')).toBe('added')
    expect(toCommitKind('deleted')).toBe('removed')
    expect(toCommitKind('modified')).toBe('changed')
  })

  it('builds tree items from file changes', () => {
    expect(
      toTreeItems([{ path: 'a.txt', status: 'added' } as GitFileChange])
    ).toEqual([{ path: 'a.txt', kind: 'added' }])
  })

  it('extracts file names from paths', () => {
    expect(fileNameFromPath('src/lib/file.ts')).toBe('file.ts')
    expect(fileNameFromPath('src/lib/')).toBe('lib/')
  })
})

describe('FolderCounts', () => {
  it('renders changed, added, and removed counts', () => {
    render(<FolderCounts counts={{ changed: 2, added: 3, removed: 1 }} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
    expect(screen.getByText('-1')).toBeInTheDocument()
  })
})

describe('FileRow', () => {
  const t = ((key: string) => key) as import('i18next').TFunction
  const file = { path: 'src/a.txt', status: 'modified' } as GitFileChange

  it('selects a file in working mode', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FileRow
        file={file}
        onSelect={onSelect}
        selected={false}
        onStage={vi.fn()}
        mode="working"
        openMenu={vi.fn()}
        stageLabel="Stage"
        unstageLabel="Unstage"
        t={t}
      />
    )

    await user.click(screen.getByText('src/a.txt'))
    expect(onSelect).toHaveBeenCalled()
  })
})

describe('TreeNode', () => {
  const t = ((key: string) => key) as import('i18next').TFunction
  const file = { path: 'src/a.txt', status: 'modified' } as GitFileChange

  it('expands a folder and renders nested files', async () => {
    const user = userEvent.setup()
    const toggleExpanded = vi.fn()
    render(
      <TreeNode
        node={{
          type: 'folder',
          name: 'src',
          path: 'src',
          counts: { changed: 1, added: 0, removed: 0 },
          children: [{ type: 'file', name: 'a.txt', path: 'src/a.txt', kind: 'changed' }]
        }}
        depth={0}
        selectedFile={null}
        setSelectedFile={vi.fn()}
        expandedPaths={new Set(['src'])}
        toggleExpanded={toggleExpanded}
        pathToFile={new Map([['src/a.txt', file]])}
        mode="working"
        onStage={vi.fn()}
        openMenu={vi.fn()}
        stageLabel="Stage"
        unstageLabel="Unstage"
        t={t}
      />
    )

    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('a.txt')).toBeInTheDocument()
    await user.click(screen.getByText('src'))
    expect(toggleExpanded).toHaveBeenCalledWith('src')
  })
})
