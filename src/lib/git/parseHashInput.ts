export function parseHashInput(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[0-9a-f]{7,40}$/.test(part))
}
