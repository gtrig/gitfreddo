import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workingAddToGitignore, workingRead } from './working'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
}

describe('workingRead', () => {
  it('returns exists false when the file is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-working-read-'))
    initRepo(dir)

    await expect(workingRead(dir, 'git', '.gitattributes')).resolves.toEqual({
      exists: false,
      content: ''
    })
  })

  it('returns file content when the file exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-working-read-'))
    initRepo(dir)
    writeFileSync(join(dir, '.gitattributes'), '*.txt text\n')

    await expect(workingRead(dir, 'git', '.gitattributes')).resolves.toEqual({
      exists: true,
      content: '*.txt text\n'
    })
  })
})

describe('workingAddToGitignore', () => {
  it('creates .gitignore and ignores an untracked file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-gitignore-'))
    initRepo(dir)
    writeFileSync(join(dir, 'tracked.txt'), 'secret\n')
    writeFileSync(join(dir, 'noise.log'), 'noise\n')

    await workingAddToGitignore(dir, 'git', 'noise.log')

    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8')
    expect(gitignore).toContain('noise.log')
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' })
    expect(status).not.toContain('noise.log')
    expect(status).toContain('tracked.txt')
  })

  it('stops tracking a tracked file without deleting it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-gitignore-'))
    initRepo(dir)
    writeFileSync(join(dir, 'keep.me'), 'keep\n')
    execSync('git add keep.me', { cwd: dir, stdio: 'ignore' })
    execSync('git commit -m "add"', { cwd: dir, stdio: 'ignore' })
    writeFileSync(join(dir, 'keep.me'), 'changed\n')

    await workingAddToGitignore(dir, 'git', 'keep.me')

    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8')
    expect(gitignore).toContain('keep.me')
    const tracked = execSync('git ls-files keep.me', { cwd: dir, encoding: 'utf8' })
    expect(tracked.trim()).toBe('')
    expect(readFileSync(join(dir, 'keep.me'), 'utf8')).toBe('changed\n')
  })

  it('ignores an untracked folder and its contents', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-gitignore-'))
    initRepo(dir)
    mkdirSync(join(dir, 'build/output'), { recursive: true })
    writeFileSync(join(dir, 'build/output/app.bin'), 'artifact\n')
    writeFileSync(join(dir, 'tracked.txt'), 'tracked\n')

    await workingAddToGitignore(dir, 'git', 'build', true)

    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8')
    expect(gitignore).toContain('build/')
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' })
    expect(status).not.toContain('build/')
    expect(status).toContain('tracked.txt')
  })

  it('stops tracking files inside a tracked folder without deleting them', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-gitignore-'))
    initRepo(dir)
    mkdirSync(join(dir, 'dist'), { recursive: true })
    writeFileSync(join(dir, 'dist/a.txt'), 'one\n')
    writeFileSync(join(dir, 'dist/b.txt'), 'two\n')
    execSync('git add dist', { cwd: dir, stdio: 'ignore' })
    execSync('git commit -m "add dist"', { cwd: dir, stdio: 'ignore' })
    writeFileSync(join(dir, 'dist/a.txt'), 'changed\n')

    await workingAddToGitignore(dir, 'git', 'dist', true)

    const gitignore = readFileSync(join(dir, '.gitignore'), 'utf8')
    expect(gitignore).toContain('dist/')
    const tracked = execSync('git ls-files dist', { cwd: dir, encoding: 'utf8' })
    expect(tracked.trim()).toBe('')
    expect(readFileSync(join(dir, 'dist/a.txt'), 'utf8')).toBe('changed\n')
  })
})
