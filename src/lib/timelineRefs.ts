import { isStashRef } from './stashCommit'

const TAG_PREFIX = /^tag:\s*/i
const REFS_TAGS_PREFIX = 'refs/tags/'

export type TimelineRefKind = 'branch' | 'remote' | 'tag'

export interface TimelineRef {
  label: string
  kind: TimelineRefKind
  fullRef: string
  sourceOrder: number
}

function isHeadRef(ref: string): boolean {
  const trimmed = ref.trim()
  return trimmed === 'HEAD' || /\/HEAD$/i.test(trimmed)
}

function parseRef(
  raw: string,
  sourceOrder: number,
  tagNames?: ReadonlySet<string>
): TimelineRef | null {
  let trimmed = raw.trim()
  if (!trimmed || isHeadRef(trimmed) || isStashRef(trimmed)) return null

  let kind: TimelineRefKind = 'branch'
  if (TAG_PREFIX.test(trimmed)) {
    trimmed = trimmed.replace(TAG_PREFIX, '')
    kind = 'tag'
  } else if (trimmed.startsWith(REFS_TAGS_PREFIX)) {
    trimmed = trimmed.slice(REFS_TAGS_PREFIX.length)
    kind = 'tag'
  }

  trimmed = trimmed.replace(/^HEAD\s*->\s*/, '').trim()
  if (!trimmed || isHeadRef(trimmed)) return null

  if (kind !== 'tag' && tagNames?.has(trimmed)) {
    kind = 'tag'
  }

  if (kind !== 'tag' && trimmed.includes('/')) {
    kind = 'remote'
  }

  return { label: trimmed, kind, fullRef: trimmed, sourceOrder }
}

export function refKey(ref: TimelineRef): string {
  return `${ref.kind}:${ref.label}`
}

export function timelineRefs(
  rawRefs: string[],
  tagNames?: ReadonlySet<string>
): TimelineRef[] {
  const refs = rawRefs
    .map((raw, index) => parseRef(raw, index, tagNames))
    .filter((ref): ref is TimelineRef => ref !== null)

  const unique = new Map<string, TimelineRef>()
  for (const ref of refs) {
    const key = refKey(ref)
    const existing = unique.get(key)
    if (!existing || ref.sourceOrder > existing.sourceOrder) {
      unique.set(key, ref)
    }
  }

  const deduped = [...unique.values()]
  const locals = deduped.filter((ref) => ref.kind !== 'remote')
  const localNames = new Set(locals.map((ref) => ref.label))
  const remotes = deduped.filter((ref) => {
    if (ref.kind !== 'remote') return false
    const shortName = ref.label.slice(ref.label.indexOf('/') + 1)
    return !localNames.has(shortName)
  })

  return [...locals, ...remotes]
}

export function primaryTimelineRef(refs: TimelineRef[]): TimelineRef | null {
  if (refs.length === 0) return null
  return refs.reduce((latest, ref) => (ref.sourceOrder > latest.sourceOrder ? ref : latest))
}

export function splitTimelineRefs(refs: TimelineRef[]): {
  primary: TimelineRef | null
  rest: TimelineRef[]
} {
  const primary = primaryTimelineRef(refs)
  if (!primary) {
    return { primary: null, rest: [] }
  }

  const rest = refs
    .filter((ref) => refKey(ref) !== refKey(primary))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)

  return { primary, rest }
}
