import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { statusColor, statusLabel, type GitFileChange } from '@/lib/types'

function FileRow({
  file,
  onSelect,
  selected,
  onStage
}: {
  file: GitFileChange
  onSelect: () => void
  selected: boolean
  onStage?: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded px-2 py-1 text-left text-sm hover:bg-zinc-800 ${
          selected ? 'bg-zinc-800 text-white' : 'text-zinc-300'
        }`}
      >
        <span className={`mr-2 font-mono text-xs ${statusColor(file.status)}`}>
          {statusLabel(file.status)}
        </span>
        {file.path}
      </button>
      {onStage && (
        <button
          type="button"
          onClick={onStage}
          className="rounded px-2 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800"
        >
          stage
        </button>
      )}
    </div>
  )
}

export function GitWorkingTree() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data, isLoading, error } = useWorkingStatus(connected)
  const { stageAdd, stageReset } = useGitMutations()
  const selectedFile = useSelectionStore((s) => s.selectedWorkingFile)
  const setSelectedWorkingFile = useSelectionStore((s) => s.setSelectedWorkingFile)

  if (!connected) {
    return <p className="p-4 text-sm text-zinc-600">Open a repository to view changes.</p>
  }

  if (isLoading) return <p className="p-4 text-sm text-zinc-500">Loading…</p>
  if (error) return <p className="text-sm text-red-400 p-4">{(error as Error).message}</p>

  const renderSection = (
    title: string,
    files: GitFileChange[],
    mode: 'working' | 'staged',
    canStage: boolean
  ) => (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {files.length === 0 ? (
        <p className="text-xs text-zinc-600">None</p>
      ) : (
        <div className="space-y-0.5">
          {files.map((file) => (
            <FileRow
              key={file.path}
              file={file}
              selected={selectedFile === file.path}
              onSelect={() => setSelectedWorkingFile(file.path, mode)}
              onStage={
                canStage
                  ? () => void stageAdd.mutateAsync({ paths: [file.path] })
                  : () => void stageReset.mutateAsync({ paths: [file.path] })
              }
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Branch <span className="text-zinc-200">{data?.branch}</span>
          {data && (data.ahead > 0 || data.behind > 0) && (
            <span className="ml-2 text-xs text-zinc-500">
              {data.ahead > 0 && `↑${data.ahead}`}
              {data.behind > 0 && ` ↓${data.behind}`}
            </span>
          )}
        </p>
        {data && !data.isClean && (
          <button
            type="button"
            onClick={() => void stageAdd.mutateAsync({ paths: [] })}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            Stage all
          </button>
        )}
      </div>
      {renderSection('Staged', data?.staged ?? [], 'staged', false)}
      {renderSection('Unstaged', data?.unstaged ?? [], 'working', true)}
      {renderSection('Untracked', data?.untracked ?? [], 'working', true)}
      {(data?.conflicted ?? []).length > 0 &&
        renderSection('Conflicted', data?.conflicted ?? [], 'working', true)}
    </div>
  )
}
