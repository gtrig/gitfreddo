import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { notesAdd, notesList } from './notes'

let tmpDir: string
let commitHash: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-notes-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' })
  writeFileSync(join(tmpDir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' })
  commitHash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('notesList', () => {
  it('returns empty when no notes exist', async () => {
    const notes = await notesList(tmpDir, 'git')
    expect(notes).toHaveLength(0)
  })

  it('returns empty for a commit with no note', async () => {
    const notes = await notesList(tmpDir, 'git', commitHash)
    expect(notes).toHaveLength(0)
  })
})

describe('notesAdd + notesList', () => {
  it('adds a note and retrieves it by commit hash', async () => {
    await notesAdd(tmpDir, 'git', commitHash, 'my note message')
    const notes = await notesList(tmpDir, 'git', commitHash)
    expect(notes).toHaveLength(1)
    expect(notes[0].note).toBe('my note message')
    expect(notes[0].hash).toBe(commitHash)
  })

  it('adds a note and lists it from notesList without hash', async () => {
    await notesAdd(tmpDir, 'git', commitHash, 'global note')
    const notes = await notesList(tmpDir, 'git')
    expect(notes.some((n) => n.note === 'global note')).toBe(true)
  })

  it('overwrites a note when force is true', async () => {
    await notesAdd(tmpDir, 'git', commitHash, 'original')
    await notesAdd(tmpDir, 'git', commitHash, 'overwritten', { force: true })
    const notes = await notesList(tmpDir, 'git', commitHash)
    expect(notes[0].note).toBe('overwritten')
  })
})
