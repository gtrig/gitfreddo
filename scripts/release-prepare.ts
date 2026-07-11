import { execSync } from 'node:child_process'
import { normalizeReleaseTag } from '../shared/release-version.ts'
import { versionFromReleaseTag } from '../shared/release.ts'

const tagArg = process.argv[2]
if (!tagArg) {
  console.error('usage: npm run release:prepare -- vX.Y.Z')
  process.exit(1)
}

const version = versionFromReleaseTag(tagArg)
const normalizedTag = normalizeReleaseTag(tagArg)
if (!version || !normalizedTag) {
  console.error(`Invalid release tag: ${tagArg}`)
  process.exit(1)
}

execSync(`npm run release:set-version -- ${normalizedTag}`, { stdio: 'inherit', cwd: process.cwd() })

console.log('')
console.log(`Prepared release ${normalizedTag} (package.json → ${version}).`)
console.log('')
console.log('Next steps:')
console.log(`  1. Move [Unreleased] entries in CHANGELOG.md and NEWS.md into ## [${version}]`)
console.log(`  2. git add package.json package-lock.json CHANGELOG.md NEWS.md`)
console.log(`  3. git commit -m "chore: release ${normalizedTag}"`)
console.log(`  4. git tag ${normalizedTag}`)
console.log(`  5. git push origin HEAD && git push origin ${normalizedTag}`)
