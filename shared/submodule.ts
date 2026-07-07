export type {
  SubmoduleEntryStatus,
  SubmoduleRecursion,
  PushSubmoduleRecursion,
  GitSubmoduleEntry,
  ParsedSubmoduleConfig,
  ParsedSubmoduleStatusLine
} from './submodule-types'

export {
  submoduleRecursionCloneArgs,
  submoduleRecursionFetchArgs,
  pushSubmoduleRecursionArgs,
  parseGitmodulesConfig,
  parseSubmoduleStatusLine,
  submoduleStatusFromPrefix
} from './submodule-types'
