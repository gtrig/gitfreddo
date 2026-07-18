import { parseNewsVersionUpdates, type NewsVersionUpdate } from '@/lib/news/parseNews'

const newsModules = import.meta.glob<string>('../../../NEWS.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const newsMarkdown = Object.values(newsModules)[0] ?? ''

export function getNewsMarkdown(): string {
  return newsMarkdown
}

/** Startup-modal updates from NEWS.md (newest non-empty version sections). */
export function getStartupNewsUpdates(maxVersions = 3): NewsVersionUpdate[] {
  return parseNewsVersionUpdates(getNewsMarkdown(), { maxVersions })
}
