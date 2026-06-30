import { CommitTimeline } from './CommitTimeline'

export function TimelinePanel() {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Commit graph</h2>
        <p className="text-[11px] text-zinc-600">Commits and branches · click to inspect</p>
      </div>
      <CommitTimeline />
    </section>
  )
}
