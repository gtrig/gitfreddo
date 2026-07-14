export interface TtlCache<T> {
  get(): T | null
  set(value: T): void
  clear(): void
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  let value: T | null = null
  let expiresAt = 0

  return {
    get() {
      if (value !== null && Date.now() < expiresAt) {
        return value
      }
      return null
    },
    set(next: T) {
      value = next
      expiresAt = Date.now() + ttlMs
    },
    clear() {
      value = null
      expiresAt = 0
    }
  }
}
