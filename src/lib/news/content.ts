import { parseNewsItems } from '@/lib/news/parseNews'

const newsModules = import.meta.glob<string>('../../../NEWS.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const newsMarkdown = Object.values(newsModules)[0] ?? ''

export function getNewsMarkdown(): string {
  return newsMarkdown
}

/** Startup-modal bullets from NEWS.md (prefer Unreleased, else newest release). */
export function getStartupNewsItems(maxItems = 5): string[] {
  return parseNewsItems(getNewsMarkdown(), { maxItems })
}
