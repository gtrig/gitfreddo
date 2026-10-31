const SIMPLE_ESCAPES: Record<string, number> = {
  a: 0x07,
  b: 0x08,
  t: 0x09,
  n: 0x0a,
  v: 0x0b,
  f: 0x0c,
  r: 0x0d,
  '"': 0x22,
  '\\': 0x5c
}

function isOctalDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '7'
}

/** Decode a git C-quoted pathname (`"foo\\tbar"`, octal bytes) into UTF-8. */
export function unquoteGitPath(raw: string): string {
  if (raw.length < 2 || raw[0] !== '"' || raw[raw.length - 1] !== '"') {
    return raw
  }

  const inner = raw.slice(1, -1)
  const bytes: number[] = []
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!
    if (ch !== '\\') {
      bytes.push(inner.charCodeAt(i))
      continue
    }

    const next = inner[i + 1]
    if (next === undefined) {
      bytes.push(0x5c)
      break
    }

    if (isOctalDigit(next)) {
      let oct = next
      i += 1
      if (isOctalDigit(inner[i + 1])) {
        oct += inner[i + 1]!
        i += 1
        if (isOctalDigit(inner[i + 1])) {
          oct += inner[i + 1]!
          i += 1
        }
      }
      bytes.push(parseInt(oct, 8))
      continue
    }

    const mapped = SIMPLE_ESCAPES[next]
    bytes.push(mapped ?? next.charCodeAt(0))
    i += 1
  }

  return new TextDecoder('utf-8').decode(Uint8Array.from(bytes))
}
