import { CommitTimeline } from './CommitTimeline'

export function TimelinePanel() {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-gf-border px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gf-fg-subtle">Commit graph</h2>
        <p className="text-[11px] text-gf-fg-subtle">Commits and branches · click to inspect</p>
      </div>
      <CommitTimeline />
    </section>
  )
}
