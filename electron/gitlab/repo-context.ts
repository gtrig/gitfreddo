import { parseGitlabRemote } from '../../shared/gitlab'
import { createRepoContextResolver } from '../forge/repo-context'

export const resolveGitlabRepoContext = createRepoContextResolver(
  (url, settings) => parseGitlabRemote(url, settings.gitlabHost),
  'GitLab'
)
