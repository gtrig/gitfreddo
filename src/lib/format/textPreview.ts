export const COMMIT_DESCRIPTION_PREVIEW_CHARS = 200

export function previewCommitDescription(
  text: string,
  maxChars = COMMIT_DESCRIPTION_PREVIEW_CHARS
): { preview: string; truncated: boolean } {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) {
    return { preview: trimmed, truncated: false }
  }

  let cut = trimmed.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > maxChars * 0.6) {
    cut = cut.slice(0, lastSpace)
  }

  return { preview: cut.trimEnd(), truncated: true }
}
