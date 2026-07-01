import { runGitOrThrow } from '../git-runner'

export interface GitReflogEntry {
  hash: string
  shortHash: string
  selector: string
  subject: string
  timestamp: string
}

export async function reflogList(
  cwd: string,
  gitBinaryPath: string,
  maxCount = 200
): Promise<GitReflogEntry[]> {
  const stdout = await runGitOrThrow(
    ['reflog', '--format=%H %gD %gs', '-n', String(maxCount)],
    { cwd, gitBinaryPath }
  )

  return stdout
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return null
      const space = trimmed.indexOf(' ')
      if (space <= 0) return null
      const hash = trimmed.slice(0, space)
      const rest = trimmed.slice(space + 1)
      const tab = rest.indexOf('\t')
      const selectorPart = tab >= 0 ? rest.slice(0, tab) : rest
      const subject = tab >= 0 ? rest.slice(tab + 1) : ''
      const selectorMatch = selectorPart.match(/(\S+@\{\d+\})/)
      return {
        hash,
        shortHash: hash.slice(0, 7),
        selector: selectorMatch?.[1] ?? selectorPart,
        subject,
        timestamp: selectorPart.replace(/\s+\S+$/, '').trim()
      } satisfies GitReflogEntry
    })
    .filter((entry): entry is GitReflogEntry => entry !== null)
}
