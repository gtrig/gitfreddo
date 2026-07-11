import { describe, expect, it } from 'vitest'
import { humanizeErrorMessage } from './errorMessage'

describe('humanizeErrorMessage', () => {
  it('returns a generic message for empty input', () => {
    expect(humanizeErrorMessage('')).toBe('Something went wrong.')
  })

  it('recognizes rejected SSH keys', () => {
    expect(humanizeErrorMessage('git@github.com: Permission denied (publickey).')).toBe(
      "Your SSH key was rejected. Make sure it's added to your account and loaded in your SSH agent."
    )
  })

  it('recognizes unresolvable remote hosts', () => {
    const raw =
      "ssh: Could not resolve hostname github.com: Name or service not known\nfatal: Could not read from remote repository."
    expect(humanizeErrorMessage(raw)).toBe(
      "Couldn't reach the remote server. Check your internet connection and the remote URL."
    )
  })

  it('recognizes authentication failures', () => {
    expect(
      humanizeErrorMessage("fatal: Authentication failed for 'https://github.com/foo/bar.git/'")
    ).toBe('Authentication failed. Check your saved credentials or SSH key, then try again.')
  })

  it('recognizes non-fast-forward push rejections', () => {
    const raw = [
      "error: failed to push some refs to 'https://github.com/foo/bar.git'",
      'hint: Updates were rejected because the tip of your current branch is behind',
      "hint: its remote counterpart. Integrate the remote changes (e.g. 'git pull ...')",
      "hint: before pushing again."
    ].join('\n')
    expect(humanizeErrorMessage(raw)).toBe(
      "Push was rejected because the remote has changes you don't have locally. Pull or fetch first, then try again."
    )
  })

  it('recognizes merge conflicts', () => {
    expect(
      humanizeErrorMessage('Automatic merge failed; fix conflicts and then commit the result.')
    ).toBe('Merge conflicts need to be resolved before you can continue.')
  })

  it('recognizes a dirty working tree blocking checkout', () => {
    const raw =
      'error: Your local changes to the following files would be overwritten by checkout:\n\tfile.txt\nPlease commit your changes or stash them before you switch branches.'
    expect(humanizeErrorMessage(raw)).toBe(
      'You have uncommitted changes that would be overwritten. Commit or stash them first.'
    )
  })

  it('recognizes a missing git repository', () => {
    expect(humanizeErrorMessage('fatal: not a git repository (or any of the parent directories): .git')).toBe(
      "This folder isn't a Git repository."
    )
  })

  it('recognizes an empty working tree on commit', () => {
    expect(humanizeErrorMessage('nothing to commit, working tree clean')).toBe(
      "There's nothing to commit — your working tree is clean."
    )
  })

  it('recognizes name collisions', () => {
    expect(humanizeErrorMessage("fatal: A branch named 'feature' already exists.")).toBe(
      'That name is already in use.'
    )
  })

  it('recognizes filesystem not-found errors', () => {
    expect(humanizeErrorMessage('ENOENT: no such file or directory, open \'/tmp/missing.txt\'')).toBe(
      "That file or folder couldn't be found."
    )
  })

  it('recognizes filesystem permission errors', () => {
    expect(humanizeErrorMessage('EACCES: permission denied, open \'/etc/shadow\'')).toBe(
      'Permission denied. Check that you have access to this file or folder.'
    )
  })

  it('recognizes GitHub API auth rejections with the service name', () => {
    expect(humanizeErrorMessage('GitHub API error (403): Bad credentials')).toBe(
      'GitHub rejected the request. Try reconnecting your account in Settings → Integrations.'
    )
  })

  it('recognizes Bitbucket API rate limiting with the service name', () => {
    expect(humanizeErrorMessage('Bitbucket API error (429): Too Many Requests')).toBe(
      'Bitbucket is rate-limiting requests right now. Wait a bit and try again.'
    )
  })

  it('recognizes GitHub API server errors', () => {
    expect(humanizeErrorMessage('GitHub GraphQL error (503): Service Unavailable')).toBe(
      'GitHub is having problems right now. Try again in a bit.'
    )
  })

  it('falls back to a cleaned, sentence-cased first fatal/error line for unknown errors', () => {
    const raw = 'warning: something noisy\nfatal: some very specific unmapped git failure occurred'
    expect(humanizeErrorMessage(raw)).toBe('Some very specific unmapped git failure occurred.')
  })

  it('leaves already-clean short messages unchanged', () => {
    expect(humanizeErrorMessage('Failed to push changes.')).toBe('Failed to push changes.')
  })

  it('truncates very long fallback messages', () => {
    const longLine = `fatal: ${'x'.repeat(300)}`
    const result = humanizeErrorMessage(longLine)
    expect(result.length).toBeLessThanOrEqual(180)
    expect(result.endsWith('…')).toBe(true)
  })
})
