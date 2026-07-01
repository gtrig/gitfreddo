import { isStashRef } from './stashCommit'

function isHeadRef(ref: string): boolean {
  const trimmed = ref.trim()
  return trimmed === 'HEAD' || /\/HEAD$/i.test(trimmed)
}

export function timelineRefs(rawRefs: string[]): string[] {
  const refs = rawRefs
    .filter((ref) => !isHeadRef(ref) && !isStashRef(ref))
    .map((ref) => ref.replace(/^HEAD\s*->\s*/, '').trim())
    .filter((ref) => Boolean(ref) && !isHeadRef(ref))

  const unique = [...new Set(refs)]
  const locals = unique.filter((ref) => !ref.includes('/'))
  const localNames = new Set(locals)
  const remotes = unique.filter((ref) => {
    if (!ref.includes('/')) return false
    const shortName = ref.slice(ref.indexOf('/') + 1)
    return !localNames.has(shortName)
  })

  return [...locals, ...remotes]
}
