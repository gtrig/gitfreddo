import { describe, expect, it } from 'vitest'
import { detectLanguage } from './detectLanguage'

describe('detectLanguage', () => {
  it('returns plaintext for empty or missing paths', () => {
    expect(detectLanguage('')).toBe('plaintext')
    expect(detectLanguage(undefined)).toBe('plaintext')
  })

  it('detects languages from common extensions', () => {
    expect(detectLanguage('src/app.ts')).toBe('javascript')
    expect(detectLanguage('src/app.tsx')).toBe('javascript')
    expect(detectLanguage('src/app.js')).toBe('javascript')
    expect(detectLanguage('src/app.jsx')).toBe('javascript')
    expect(detectLanguage('src/app.mjs')).toBe('javascript')
    expect(detectLanguage('src/app.cjs')).toBe('javascript')
    expect(detectLanguage('package.json')).toBe('json')
    expect(detectLanguage('index.html')).toBe('html')
    expect(detectLanguage('styles.css')).toBe('css')
    expect(detectLanguage('styles.scss')).toBe('css')
    expect(detectLanguage('main.py')).toBe('python')
    expect(detectLanguage('README.md')).toBe('markdown')
    expect(detectLanguage('schema.xml')).toBe('xml')
    expect(detectLanguage('config.svg')).toBe('xml')
  })

  it('detects shell scripts from extension and hook filenames', () => {
    expect(detectLanguage('scripts/build.sh')).toBe('shell')
    expect(detectLanguage('scripts/setup.bash')).toBe('shell')
    expect(detectLanguage('scripts/run.zsh')).toBe('shell')
    expect(detectLanguage('.git/hooks/pre-commit')).toBe('shell')
    expect(detectLanguage('pre-push')).toBe('shell')
    expect(detectLanguage('pre-commit.sample')).toBe('shell')
  })

  it('treats gitignore-style config files as plaintext', () => {
    expect(detectLanguage('.gitignore')).toBe('plaintext')
    expect(detectLanguage('.gitattributes')).toBe('plaintext')
    expect(detectLanguage('.gitmodules')).toBe('plaintext')
  })

  it('falls back to plaintext for unknown extensions', () => {
    expect(detectLanguage('image.png')).toBe('plaintext')
    expect(detectLanguage('binary.bin')).toBe('plaintext')
    expect(detectLanguage('Makefile')).toBe('plaintext')
  })

  it('uses only the basename when given a path', () => {
    expect(detectLanguage('/tmp/repo/src/lib/foo.ts')).toBe('javascript')
    expect(detectLanguage('deep/nested/path/hooks/pre-commit')).toBe('shell')
  })
})
