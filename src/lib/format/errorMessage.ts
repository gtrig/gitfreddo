interface ErrorRule {
  test: RegExp
  friendly: string
}

// Checked in order — most specific network/SSH causes come before the
// broader "authentication failed" catch-all they would otherwise also match.
const ERROR_RULES: ErrorRule[] = [
  {
    test: /permission denied \(publickey/i,
    friendly: "Your SSH key was rejected. Make sure it's added to your account and loaded in your SSH agent."
  },
  {
    test: /host key verification failed/i,
    friendly: "The remote server's SSH host key couldn't be verified. Remove any stale entry from your known_hosts file."
  },
  {
    test: /could not resolve host|name or service not known|getaddrinfo enotfound/i,
    friendly: "Couldn't reach the remote server. Check your internet connection and the remote URL."
  },
  {
    test: /connection timed out|operation timed out|etimedout/i,
    friendly: 'The connection timed out. Check your network and try again.'
  },
  {
    test: /connection refused|econnrefused/i,
    friendly: 'The remote server refused the connection.'
  },
  {
    test: /ssl certificate problem|self[- ]signed certificate|unable to get local issuer certificate/i,
    friendly: "There's a problem with the remote server's security certificate."
  },
  {
    test: /authentication failed|invalid username or password|bad credentials|could not read username|could not read password|terminal prompts disabled|401 unauthorized/i,
    friendly: 'Authentication failed. Check your saved credentials or SSH key, then try again.'
  },
  {
    test: /submodule paths contain changes|recurse into submodule|not be found on any remote/i,
    friendly:
      "Push blocked by a submodule check: a submodule commit isn't on its remote yet. Push the submodule first, or set Settings → Git → Push recursion to No."
  },
  {
    test: /protected branch|pre-receive hook declined|\[remote rejected\]/i,
    friendly:
      'The remote rejected the push (branch protection or a server-side hook). Check your permissions and branch rules.'
  },
  {
    test: /pre-push hook|husky -|husky\.sh|hook declined by/i,
    friendly: 'A local git hook blocked the push. Open the Logs drawer for the hook output.'
  },
  {
    // Require an actual non-fast-forward / behind signal — bare "failed to push some refs"
    // also appears for hooks, submodule checks, and protected branches.
    test: /non-fast-forward|updates were rejected because the tip of your current branch is behind|updates were rejected because the remote contains work/i,
    friendly:
      "Push was rejected because the remote has changes you don't have locally. Pull or fetch first, then try again."
  },
  {
    test: /automatic merge failed|fix conflicts and then commit|you have unmerged files/i,
    friendly: 'Merge conflicts need to be resolved before you can continue.'
  },
  {
    test: /would be overwritten by (?:checkout|merge)|please commit your changes or stash them/i,
    friendly: 'You have uncommitted changes that would be overwritten. Commit or stash them first.'
  },
  {
    test: /not a git repository/i,
    friendly: "This folder isn't a Git repository."
  },
  {
    test: /nothing to commit/i,
    friendly: "There's nothing to commit — your working tree is clean."
  },
  {
    test: /already exists/i,
    friendly: 'That name is already in use.'
  },
  {
    test: /did not match any file|couldn't find remote ref|unknown revision or path not in the working tree/i,
    friendly: "Git couldn't find that branch, tag, or file."
  },
  {
    test: /no configured push destination|does not appear to be a git repository/i,
    friendly: 'No remote is configured for this repository.'
  },
  {
    test: /repository '.*' not found/i,
    friendly: "That repository couldn't be found. Check the URL and your access permissions."
  },
  {
    test: /no such file or directory/i,
    friendly: "That file or folder couldn't be found."
  },
  {
    test: /eacces|permission denied/i,
    friendly: 'Permission denied. Check that you have access to this file or folder.'
  },
  {
    test: /ebusy|resource busy or locked/i,
    friendly: 'That file is in use by another program. Close it and try again.'
  },
  {
    test: /invalid api key|incorrect api key|api key.*invalid/i,
    friendly: 'Your AI API key was rejected. Check it in Settings → AI.'
  },
  {
    test: /failed to fetch|fetch failed|network error/i,
    friendly: "Couldn't reach the service. Check your internet connection and try again."
  }
]

const FORGE_API_ERROR = /(GitHub|Bitbucket) (?:API|GraphQL) error \((\d{3})\)/i

function humanizeForgeApiError(message: string): string | null {
  const match = message.match(FORGE_API_ERROR)
  if (!match) return null

  const [, service, statusText] = match
  const status = Number(statusText)

  if (status === 401 || status === 403) {
    return `${service} rejected the request. Try reconnecting your account in Settings → Integrations.`
  }
  if (status === 404) {
    return `${service} couldn't find that. It may have been deleted or renamed, or you may not have access.`
  }
  if (status === 429) {
    return `${service} is rate-limiting requests right now. Wait a bit and try again.`
  }
  if (status >= 500) {
    return `${service} is having problems right now. Try again in a bit.`
  }
  return `${service} rejected the request (${status}).`
}

function firstMeaningfulLine(message: string): string {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const fatalOrError = lines.find((line) => /^(fatal|error):/i.test(line))
  const chosen = fatalOrError ?? lines[0] ?? message

  return chosen.replace(/^(fatal|error):\s*/i, '').trim()
}

const MAX_LENGTH = 180

function toSentence(text: string): string {
  if (!text) return 'Something went wrong.'

  const capitalized = text.charAt(0).toUpperCase() + text.slice(1)
  const withPunctuation = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`

  if (withPunctuation.length <= MAX_LENGTH) return withPunctuation
  return `${withPunctuation.slice(0, MAX_LENGTH - 1).trimEnd()}…`
}

/**
 * Turns a raw git/network/filesystem error message into a short, friendly
 * sentence a non-technical user can act on. Falls back to a cleaned-up
 * version of the original message (first fatal/error line, sentence-cased,
 * truncated) when no known pattern matches, so unmapped errors still read
 * reasonably instead of dumping a raw multi-line stack/hint block.
 */
export function humanizeErrorMessage(raw: string): string {
  const message = (raw ?? '').trim()
  if (!message) return 'Something went wrong.'

  const forgeFriendly = humanizeForgeApiError(message)
  if (forgeFriendly) return forgeFriendly

  const rule = ERROR_RULES.find(({ test }) => test.test(message))
  if (rule) return rule.friendly

  return toSentence(firstMeaningfulLine(message))
}
