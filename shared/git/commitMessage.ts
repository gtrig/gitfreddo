export function buildCommitMessage(summary: string, description: string): string {
  const subject = summary.trim()
  const body = description.trim()
  if (!body) return subject
  return `${subject}\n\n${body}`
}

export function parseCommitMessage(text: string): { summary: string; description: string } {
  const trimmed = text.trim()
  const paragraphs = trimmed.split(/\n\n/)
  if (paragraphs.length > 1) {
    return {
      summary: paragraphs[0]?.trim() ?? '',
      description: paragraphs.slice(1).join('\n\n').trim()
    }
  }

  const lines = trimmed.split('\n')
  if (lines.length > 1) {
    return {
      summary: lines[0]?.trim() ?? '',
      description: lines.slice(1).join('\n').trim()
    }
  }

  return { summary: trimmed, description: '' }
}
