import { ForgeRepoPicker, useDebouncedSearch } from '@/components/Forge/ForgeRepoPicker'
import { useBitbucketRepos } from '@/hooks/useBitbucketRepos'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'

interface RepoPickerProps {
  selectedFullName: string | null
  onSelect: (repo: { fullName: string; cloneUrl: string }) => void
  compact?: boolean
}

export function RepoPicker({ selectedFullName, onSelect, compact = false }: RepoPickerProps) {
  const { data: status } = useBitbucketStatus()
  const connected = status?.connected ?? false
  const { search, setSearch, debouncedSearch } = useDebouncedSearch()
  const { data: repos, isLoading, error } = useBitbucketRepos(
    { search: debouncedSearch || undefined },
    connected
  )

  return (
    <ForgeRepoPicker
      i18nPrefix="bitbucket"
      selectedFullName={selectedFullName}
      onSelect={onSelect}
      compact={compact}
      connected={connected}
      search={search}
      onSearchChange={setSearch}
      isLoading={isLoading}
      error={error ? (error as Error) : null}
      repos={repos?.map((repo) => ({
        key: repo.uuid,
        fullName: repo.fullName,
        cloneUrl: repo.cloneUrl,
        description: repo.description,
        private: repo.private
      }))}
    />
  )
}
