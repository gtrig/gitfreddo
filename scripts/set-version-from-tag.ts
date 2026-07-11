import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { versionFromReleaseTag } from '../shared/release.ts'

const tag = process.argv[2]
if (!tag) {
  console.error('usage: npm run release:set-version -- vX.Y.Z')
  process.exit(1)
}

const version = versionFromReleaseTag(tag)
if (!version) {
  console.error(`Invalid release tag: ${tag}`)
  process.exit(1)
}

execSync(`npm version ${version} --no-git-tag-version --allow-same-version`, { stdio: 'inherit' })

const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string
if (packageVersion !== version) {
  console.error(`Expected package.json version ${version}, got ${packageVersion}`)
  process.exit(1)
}

console.log(`Application version set to ${version}`)
