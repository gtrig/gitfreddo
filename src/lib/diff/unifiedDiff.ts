export type DiffLineKind = 'header' | 'hunk' | 'add' | 'remove' | 'context' | 'meta'

export interface DiffLine {
  kind: DiffLineKind
  text: string
}

export interface DiffRow {
  kind: DiffLineKind
  content: string
  oldLine: number | null
  newLine: number | null
}

export interface SplitDiffRow {
  leftLineNo: number | null
  rightLineNo: number | null
  leftText: string | null
  rightText: string | null
  leftKind: 'remove' | 'context' | null
  rightKind: 'add' | 'context' | null
}

export interface DiffStats {
  additions: number
  deletions: number
}

export function buildUnifiedDiff(oldText: string, newText: string, path: string): string {
  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)

  const lines: string[] = []
  lines.push(`--- a/${path}`)
  lines.push(`+++ b/${path}`)

  let i = 0
  let j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++
      j++
      continue
    }

    const oldStart = i
    const newStart = j

    while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      let matched = false
      const peek = i + 1
      for (let k = j; k < newLines.length && k < j + 5; k++) {
        if (peek < oldLines.length && oldLines[peek] === newLines[k]) {
          matched = true
          break
        }
      }
      if (matched) {
        break
      }
      i++
    }

    while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      let matched = false
      const peek = j + 1
      for (let k = i; k < oldLines.length && k < i + 5; k++) {
        if (peek < newLines.length && newLines[peek] === oldLines[k]) {
          matched = true
          break
        }
      }
      if (matched) {
        break
      }
      j++
    }

    const oldCount = i - oldStart
    const newCount = j - newStart
    if (oldCount === 0 && newCount === 0) {
      break
    }

    lines.push(
      `@@ -${oldStart + 1},${Math.max(oldCount, 1)} +${newStart + 1},${Math.max(newCount, 1)} @@`
    )
    for (let k = oldStart; k < i; k++) {
      lines.push(`-${oldLines[k]}`)
    }
    for (let k = newStart; k < j; k++) {
      lines.push(`+${newLines[k]}`)
    }
  }

  return lines.join('\n')
}

export function buildAddedFileDiff(path: string, content: string): string {
  const lines = splitLines(content)
  if (lines.length === 0) {
    return `--- /dev/null\n+++ b/${path}\n@@ -0,0 +0,0 @@`
  }
  const body = lines.map((line) => `+${line}`).join('\n')
  return `--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n${body}`
}

export function buildRemovedFileDiff(path: string, content: string): string {
  const lines = splitLines(content)
  if (lines.length === 0) {
    return `--- a/${path}\n+++ /dev/null\n@@ -0,0 +0,0 @@`
  }
  const body = lines.map((line) => `-${line}`).join('\n')
  return `--- a/${path}\n+++ /dev/null\n@@ -1,${lines.length} +0,0 @@\n${body}`
}

export function buildFileViewDiff(path: string, content: string): string {
  const lines = splitLines(content)
  if (lines.length === 0) {
    return `--- a/${path}\n+++ b/${path}\n@@ empty file @@`
  }
  const body = lines.map((line) => ` ${line}`).join('\n')
  return `--- a/${path}\n+++ b/${path}\n@@ -1,${lines.length} +1,${lines.length} @@\n${body}`
}

export function parseUnifiedDiff(unified: string): DiffLine[] {
  return parseUnifiedDiffRows(unified).map((row) => ({
    kind: row.kind,
    text:
      row.kind === 'add'
        ? `+${row.content}`
        : row.kind === 'remove'
          ? `-${row.content}`
          : row.kind === 'context'
            ? ` ${row.content}`
            : row.content
  }))
}

export function parseUnifiedDiffRows(unified: string): DiffRow[] {
  if (!unified.trim()) {
    return []
  }

  const rows: DiffRow[] = []
  let oldLine = 0
  let newLine = 0

  for (const line of unified.split('\n')) {
    if (line.startsWith('---') || line.startsWith('+++')) {
      rows.push({ kind: 'header', content: line, oldLine: null, newLine: null })
      continue
    }
    if (line.startsWith('@@')) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (match) {
        oldLine = Number.parseInt(match[1], 10)
        newLine = Number.parseInt(match[2], 10)
      }
      rows.push({ kind: 'hunk', content: line, oldLine: null, newLine: null })
      continue
    }
    if (line.startsWith('-')) {
      rows.push({ kind: 'remove', content: line.slice(1), oldLine, newLine: null })
      oldLine++
      continue
    }
    if (line.startsWith('+')) {
      rows.push({ kind: 'add', content: line.slice(1), oldLine: null, newLine })
      newLine++
      continue
    }
    if (line.startsWith(' ') || line === '') {
      const content = line.startsWith(' ') ? line.slice(1) : line
      rows.push({ kind: 'context', content, oldLine, newLine })
      oldLine++
      newLine++
      continue
    }
    rows.push({ kind: 'meta', content: line, oldLine: null, newLine: null })
  }

  return rows
}

export function diffStatsFromRows(rows: DiffRow[]): DiffStats {
  return {
    additions: rows.filter((row) => row.kind === 'add').length,
    deletions: rows.filter((row) => row.kind === 'remove').length
  }
}

export function diffStatsFromUnified(unified: string): DiffStats {
  return diffStatsFromRows(parseUnifiedDiffRows(unified))
}

export function rowsToSplitDisplay(rows: DiffRow[]): SplitDiffRow[] {
  const codeRows = rows.filter(
    (row) => row.kind === 'add' || row.kind === 'remove' || row.kind === 'context'
  )
  const split: SplitDiffRow[] = []
  let index = 0

  while (index < codeRows.length) {
    const row = codeRows[index]
    if (row.kind === 'context') {
      split.push({
        leftLineNo: row.oldLine,
        rightLineNo: row.newLine,
        leftText: row.content,
        rightText: row.content,
        leftKind: 'context',
        rightKind: 'context'
      })
      index++
      continue
    }

    if (row.kind === 'remove') {
      const removes: DiffRow[] = []
      const adds: DiffRow[] = []
      while (index < codeRows.length && codeRows[index].kind === 'remove') {
        removes.push(codeRows[index++])
      }
      while (index < codeRows.length && codeRows[index].kind === 'add') {
        adds.push(codeRows[index++])
      }
      const pairCount = Math.max(removes.length, adds.length)
      for (let i = 0; i < pairCount; i++) {
        split.push({
          leftLineNo: removes[i]?.oldLine ?? null,
          rightLineNo: adds[i]?.newLine ?? null,
          leftText: removes[i]?.content ?? null,
          rightText: adds[i]?.content ?? null,
          leftKind: removes[i] ? 'remove' : null,
          rightKind: adds[i] ? 'add' : null
        })
      }
      continue
    }

    split.push({
      leftLineNo: null,
      rightLineNo: row.newLine,
      leftText: null,
      rightText: row.content,
      leftKind: null,
      rightKind: 'add'
    })
    index++
  }

  return split
}

export function buildHunkPatch(path: string, rows: DiffRow[]): string {
  const formattedPath = path.startsWith('/') ? path.slice(1) : path
  const lines: string[] = [`--- a/${formattedPath}`, `+++ b/${formattedPath}`, ``]
  for (const row of rows) {
    if (row.kind === 'hunk') {
      lines.push(row.content)
    } else if (row.kind === 'add') {
      lines.push(`+${row.content}`)
    } else if (row.kind === 'remove') {
      lines.push(`-${row.content}`)
    } else if (row.kind === 'context') {
      lines.push(` ${row.content}`)
    }
  }
  return lines.join('\n')
}

export function groupRowsByHunk(rows: DiffRow[]): DiffRow[][] {
  const groups: DiffRow[][] = []
  let current: DiffRow[] = []

  for (const row of rows) {
    if (row.kind === 'hunk') {
      if (current.length > 0) {
        groups.push(current)
      }
      current = [row]
      continue
    }
    if (row.kind === 'header') {
      continue
    }
    current.push(row)
  }

  if (current.length > 0) {
    groups.push(current)
  }

  return groups
}

export function splitRowsForDisplay(rows: DiffRow[]): SplitDiffRow[] {
  return rowsToSplitDisplay(rows.filter((row) => row.kind !== 'hunk' && row.kind !== 'header'))
}

export function diffStatsFromSplitRows(rows: SplitDiffRow[]): DiffStats {
  return {
    additions: rows.filter((row) => row.rightKind === 'add').length,
    deletions: rows.filter((row) => row.leftKind === 'remove').length
  }
}

type LineEditOp =
  | { type: 'equal'; line: string }
  | { type: 'delete'; line: string }
  | { type: 'insert'; line: string }

function computeLineEditScript(oldLines: string[], newLines: string[]): LineEditOp[] {
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const ops: LineEditOp[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: 'equal', line: oldLines[i] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'delete', line: oldLines[i] })
      i += 1
    } else {
      ops.push({ type: 'insert', line: newLines[j] })
      j += 1
    }
  }
  while (i < m) {
    ops.push({ type: 'delete', line: oldLines[i] })
    i += 1
  }
  while (j < n) {
    ops.push({ type: 'insert', line: newLines[j] })
    j += 1
  }
  return ops
}

/** Aligns full old/new file contents for side-by-side before/after display. */
export function alignFileLinesForSplit(oldText: string, newText: string): SplitDiffRow[] {
  const ops = computeLineEditScript(splitLines(oldText), splitLines(newText))
  const rows: SplitDiffRow[] = []
  let oldLineNo = 1
  let newLineNo = 1

  for (const op of ops) {
    if (op.type === 'equal') {
      rows.push({
        leftLineNo: oldLineNo,
        rightLineNo: newLineNo,
        leftText: op.line,
        rightText: op.line,
        leftKind: 'context',
        rightKind: 'context'
      })
      oldLineNo += 1
      newLineNo += 1
      continue
    }
    if (op.type === 'delete') {
      rows.push({
        leftLineNo: oldLineNo,
        rightLineNo: null,
        leftText: op.line,
        rightText: null,
        leftKind: 'remove',
        rightKind: null
      })
      oldLineNo += 1
      continue
    }
    rows.push({
      leftLineNo: null,
      rightLineNo: newLineNo,
      leftText: null,
      rightText: op.line,
      leftKind: null,
      rightKind: 'add'
    })
    newLineNo += 1
  }

  return rows
}

export function isBinaryContent(text: string): boolean {
  return text.includes('\0')
}

export function headHashForPath(
  path: string,
  diff: { added: FileRef[]; removed: FileRef[]; changed: FileChange[]; unchanged: FileRef[] }
): string | null {
  const removed = diff.removed.find((file) => file.path === path)
  if (removed) {
    return removed.hash
  }
  const unchanged = diff.unchanged.find((file) => file.path === path)
  if (unchanged) {
    return unchanged.hash
  }
  const changed = diff.changed.find((file) => file.path === path)
  if (changed?.old_hash) {
    return changed.old_hash
  }
  const added = diff.added.find((file) => file.path === path)
  if (added) {
    return null
  }
  return null
}

interface FileRef {
  path: string
  hash: string
}

interface FileChange {
  path: string
  old_hash?: string
  new_hash?: string
}

function splitLines(text: string): string[] {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}
