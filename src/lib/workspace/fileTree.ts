import type { CommitFileChangeKind, CommitFileItem } from '@/lib/types'

export interface CommitFileCounts {
  added: number
  changed: number
  removed: number
}

export interface FileTreeFolder {
  type: 'folder'
  name: string
  path: string
  children: FileTreeNode[]
  counts: CommitFileCounts
}

export interface FileTreeFile {
  type: 'file'
  name: string
  path: string
  kind: CommitFileChangeKind
}

export type FileTreeNode = FileTreeFolder | FileTreeFile

export function emptyCommitFileCounts(): CommitFileCounts {
  return { added: 0, changed: 0, removed: 0 }
}

export function countCommitFiles(files: CommitFileItem[]): CommitFileCounts {
  const counts = emptyCommitFileCounts()
  for (const file of files) {
    if (file.kind === 'added') counts.added += 1
    else if (file.kind === 'changed') counts.changed += 1
    else if (file.kind === 'removed') counts.removed += 1
  }
  return counts
}

function addCounts(target: CommitFileCounts, kind: CommitFileChangeKind): void {
  if (kind === 'added') target.added += 1
  else if (kind === 'changed') target.changed += 1
  else if (kind === 'removed') target.removed += 1
}

function mergeCounts(left: CommitFileCounts, right: CommitFileCounts): CommitFileCounts {
  return {
    added: left.added + right.added,
    changed: left.changed + right.changed,
    removed: left.removed + right.removed
  }
}

function comparePaths(left: string, right: string, ascending: boolean): number {
  const result = left.localeCompare(right, undefined, { sensitivity: 'base' })
  return ascending ? result : -result
}

export function sortCommitFiles(files: CommitFileItem[], ascending = true): CommitFileItem[] {
  return [...files].sort((left, right) => comparePaths(left.path, right.path, ascending))
}

function findOrCreateFolder(parent: FileTreeFolder, segment: string, folderPath: string): FileTreeFolder {
  const existing = parent.children.find(
    (child): child is FileTreeFolder => child.type === 'folder' && child.name === segment
  )
  if (existing) return existing

  const folder: FileTreeFolder = {
    type: 'folder',
    name: segment,
    path: folderPath,
    children: [],
    counts: emptyCommitFileCounts()
  }
  parent.children.push(folder)
  return folder
}

/** Split a repo path into parent folders and a leaf file or directory name. */
export function parsePathForTree(path: string): {
  parentFolders: string[]
  leafName: string
  isDirectory: boolean
} {
  const isDirectory = path.endsWith('/')
  const trimmed = path.replace(/\/+$/, '')
  if (!trimmed) {
    return { parentFolders: [], leafName: '', isDirectory: true }
  }

  const segments = trimmed.split('/')
  const leafName = segments[segments.length - 1] ?? ''
  return {
    parentFolders: segments.slice(0, -1),
    leafName,
    isDirectory
  }
}

export function buildFileTree(files: CommitFileItem[], ascending = true): FileTreeFolder {
  const root: FileTreeFolder = {
    type: 'folder',
    name: '',
    path: '',
    children: [],
    counts: emptyCommitFileCounts()
  }

  for (const file of sortCommitFiles(files, ascending)) {
    const { parentFolders, leafName, isDirectory } = parsePathForTree(file.path)
    if (!leafName) continue

    let current = root
    let currentPath = ''
    for (const segment of parentFolders) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      current = findOrCreateFolder(current, segment, currentPath)
    }

    current.children.push({
      type: 'file',
      name: isDirectory ? `${leafName}/` : leafName,
      path: file.path,
      kind: file.kind
    })
    addCounts(current.counts, file.kind)
  }

  const rollup = (folder: FileTreeFolder): CommitFileCounts => {
    let counts = emptyCommitFileCounts()
    for (const child of folder.children) {
      if (child.type === 'folder') {
        const childCounts = rollup(child)
        child.counts = childCounts
        counts = mergeCounts(counts, childCounts)
      } else {
        addCounts(counts, child.kind)
      }
    }
    folder.counts = counts
    return counts
  }

  rollup(root)

  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
    [...nodes].sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1
      }
      return comparePaths(left.name, right.name, ascending)
    })

  const sortTree = (folder: FileTreeFolder): void => {
    folder.children = sortNodes(folder.children)
    for (const child of folder.children) {
      if (child.type === 'folder') sortTree(child)
    }
  }

  sortTree(root)
  return root
}

export function collectFolderPaths(folder: FileTreeFolder): string[] {
  const paths: string[] = []
  for (const child of folder.children) {
    if (child.type === 'folder') {
      paths.push(child.path)
      paths.push(...collectFolderPaths(child))
    }
  }
  return paths
}

export function commitMessageBody(message: string, subject: string): string {
  const trimmedSubject = subject.trim()
  const lines = message.split('\n')
  if (lines[0]?.trim() === trimmedSubject) {
    return lines.slice(1).join('\n').trim()
  }
  const withoutSubject = message.replace(trimmedSubject, '').trim()
  return withoutSubject
}

export {
  buildCommitMessage,
  parseCommitMessage
} from '../../../shared/git/commitMessage'
