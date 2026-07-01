import { runGitOrThrow } from '../git-runner'

export interface GitBlameLine {
  line: number
  hash: string
  shortHash: string
  author: string
  authorMail: string
  authorTime: string
  summary: string
  content: string
}

export function parseBlamePorcelain(stdout: string): GitBlameLine[] {
  const lines: GitBlameLine[] = []
  const blocks = stdout.split('\n')
  let i = 0

  while (i < blocks.length) {
    const header = blocks[i]?.trim()
    if (!header) {
      i++
      continue
    }

    const headerMatch = /^([0-9a-f]+)\s+(\d+)\s+(\d+)/.exec(header)
    if (!headerMatch) {
      i++
      continue
    }

    const hash = headerMatch[1]!
    const line = Number.parseInt(headerMatch[3]!, 10)
    i++

    let author = ''
    let authorMail = ''
    let authorTime = ''
    let summary = ''
    let content = ''

    while (i < blocks.length) {
      const lineText = blocks[i] ?? ''
      if (/^[0-9a-f]{40}\s+\d+\s+\d+/.test(lineText.trim())) break
      if (lineText.startsWith('\t')) {
        content = lineText.slice(1)
        i++
        break
      }
      if (lineText.startsWith('author ')) author = lineText.slice('author '.length)
      if (lineText.startsWith('author-mail ')) authorMail = lineText.slice('author-mail '.length)
      if (lineText.startsWith('author-time ')) authorTime = lineText.slice('author-time '.length)
      if (lineText.startsWith('summary ')) summary = lineText.slice('summary '.length)
      i++
    }

    lines.push({
      line,
      hash,
      shortHash: hash.slice(0, 7),
      author,
      authorMail,
      authorTime,
      summary,
      content
    })
  }

  return lines
}

export async function fileBlame(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  ref?: string
): Promise<GitBlameLine[]> {
  const args = ['blame', '--line-porcelain']
  if (ref?.trim()) args.push(ref.trim())
  args.push('--', path)
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return parseBlamePorcelain(stdout)
}
