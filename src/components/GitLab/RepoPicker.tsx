import { ForgeRepoPicker, useDebouncedSearch } from '@/components/Forge/ForgeRepoPicker'
import { useGitlabRepos } from '@/hooks/useGitlabRepos'
import { useGitlabStatus } from '@/hooks/useGitlabStatus'

interface RepoPickerProps {
  selectedFullName: string | null
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  compact?: boolean
}

export function RepoPicker({ selectedFullName, onSelect, compact = false }: RepoPickerProps) {
  const { data: status } = useGitlabStatus()
  const connected = status?.connected ?? false
  const { search, setSearch, debouncedSearch } = useDebouncedSearch()
  const { data: repos, isLoading, error } = useGitlabRepos(
    { search: debouncedSearch || undefined },
    connected
  )

  return (
    <ForgeRepoPicker
      i18nPrefix="gitlab"
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
