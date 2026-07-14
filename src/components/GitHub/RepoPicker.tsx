import { ForgeRepoPicker, useDebouncedSearch } from '@/components/Forge/ForgeRepoPicker'
import { useGitHubRepos } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'

interface RepoPickerProps {
  selectedFullName: string | null
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  compact?: boolean
}

export function RepoPicker({ selectedFullName, onSelect, compact = false }: RepoPickerProps) {
  const { data: status } = useGitHubStatus()
  const connected = status?.connected ?? false
  const { search, setSearch, debouncedSearch } = useDebouncedSearch()
  const { data: repos, isLoading, error } = useGitHubRepos(
    { search: debouncedSearch || undefined },
    connected
  )

  return (
    <ForgeRepoPicker
      i18nPrefix="github"
      selectedFullName={selectedFullName}
      onSelect={onSelect}
      compact={compact}
      connected={connected}
      search={search}
      onSearchChange={setSearch}
      isLoading={isLoading}
      error={error ? (error as Error) : null}
      repos={repos?.map((repo) => ({
        key: String(repo.id),
        fullName: repo.fullName,
        cloneUrl: repo.cloneUrl,
        description: repo.description,
        private: repo.private
      }))}
    />
  )
}
