import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  findReleaseTagVersionMismatches,
  parseReleaseTagsFromPrePush
} from '../shared/release-version.ts'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const repoRoot = resolve(import.meta.dirname, '..')
const packageVersion = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))
  .version as string

const input = await readStdin()
const tags = parseReleaseTagsFromPrePush(input)
const mismatches = findReleaseTagVersionMismatches(tags, packageVersion)

if (mismatches.length === 0) {
  process.exit(0)
}

console.error('Release tag push blocked: package.json version does not match the tag.')
console.error(`  package.json version: ${packageVersion}`)
for (const tag of mismatches) {
  console.error(`  tag: ${tag}`)
}
console.error('')
console.error('Run: npm run release:prepare -- <tag>')
console.error('Then commit package.json and package-lock.json before pushing the tag.')

process.exit(1)
