import { parseBitbucketRemote } from '../../shared/bitbucket'
import { createRepoContextResolver } from '../forge/repo-context'

export const resolveBitbucketRepoContext = createRepoContextResolver(
  (url) => parseBitbucketRemote(url),
  'Bitbucket'
)
