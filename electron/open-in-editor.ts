import { spawn } from 'child_process'
import { shell } from 'electron'

export type OpenInEditorAction =
  | { type: 'default'; filePath: string }
  | { type: 'command'; command: string; args: string[] }

export function parseEditorCommand(commandLine: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < commandLine.length; i++) {
    const ch = commandLine[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else if (ch === '\\' && quote === '"' && i + 1 < commandLine.length) {
        current += commandLine[++i]
      } else {
        current += ch
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }

  if (current) tokens.push(current)
  return tokens
}

export function resolveOpenInEditorAction(
  editorCommand: string,
  filePath: string
): OpenInEditorAction {
  const tokens = parseEditorCommand(editorCommand.trim())
  if (tokens.length === 0) {
    return { type: 'default', filePath }
  }

  const [command, ...args] = tokens
  return { type: 'command', command, args: [...args, filePath] }
}

export async function openInEditor(editorCommand: string, filePath: string): Promise<void> {
  const action = resolveOpenInEditorAction(editorCommand, filePath)
  if (action.type === 'default') {
    const error = await shell.openPath(action.filePath)
    if (error) throw new Error(error)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(action.command, action.args, {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32'
    })
    child.once('error', reject)
    child.unref()
    resolve()
  })
}
