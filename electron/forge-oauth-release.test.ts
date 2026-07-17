import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Release installers rely on Actions secrets being mapped into the build env so
 * electron.vite can bake forge OAuth credentials into the main bundle.
 * Dev works via project-root .env; packaged apps do not.
 */
describe('release workflow forge OAuth bake', () => {
  const workflow = readFileSync(
    resolve(__dirname, '../.github/workflows/release.yml'),
    'utf8'
  )

  it('uses the release_secrets environment so Environment secrets are visible', () => {
    expect(workflow).toMatch(/environment:\s*release_secrets/)
  })

  it('maps GitHub, Bitbucket, and GitLab client credentials into the build env', () => {
    expect(workflow).toMatch(/GITHUB_CLIENT_ID:\s*\$\{\{\s*secrets\.GITFREDDO_GITHUB_CLIENT_ID\s*\}\}/)
    expect(workflow).toMatch(/BITBUCKET_CLIENT_ID:\s*\$\{\{\s*secrets\.BITBUCKET_CLIENT_ID\s*\}\}/)
    expect(workflow).toMatch(
      /BITBUCKET_CLIENT_SECRET:\s*\$\{\{\s*secrets\.BITBUCKET_CLIENT_SECRET\s*\}\}/
    )
    expect(workflow).toMatch(/GITLAB_CLIENT_ID:\s*\$\{\{\s*secrets\.GITLAB_CLIENT_ID\s*\}\}/)
    expect(workflow).toMatch(
      /GITLAB_CLIENT_SECRET:\s*\$\{\{\s*secrets\.GITLAB_CLIENT_SECRET\s*\}\}/
    )
  })

  it('fails the release job when bake env is incomplete', () => {
    expect(workflow).toMatch(/bash scripts\/check-forge-oauth-bake-env\.sh/)
  })
})
