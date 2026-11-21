import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { listGitIgnoredDirectories } from './repo-watcher'

let repo: string

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('listGitIgnoredDirectories', () => {
  it('lists ignored directories but not ignored single files', async () => {
    repo = realpathSync(mkdtempSync(join(tmpdir(), 'gf-ignored-dirs-')))
    execSync('git init -b main', { cwd: repo, stdio: 'ignore' })
    writeFileSync(join(repo, '.gitignore'), 'node_modules/\nout/\n*.log\n')
    mkdirSync(join(repo, 'node_modules', 'react'), { recursive: true })
    writeFileSync(join(repo, 'node_modules', 'react', 'index.js'), '')
    mkdirSync(join(repo, 'out'))
    writeFileSync(join(repo, 'out', 'main.js'), '')
    writeFileSync(join(repo, 'debug.log'), '')
    mkdirSync(join(repo, 'src'))
    writeFileSync(join(repo, 'src', 'app.ts'), '')

    const dirs = await listGitIgnoredDirectories(repo)
    expect(dirs.sort()).toEqual([join(repo, 'node_modules'), join(repo, 'out')])
  })
})
