export function localTagName(name: string): string {
  const slash = name.indexOf('/')
  return slash > 0 ? name.slice(slash + 1) : name
}

export function tagCheckoutRef(name: string): string {
  return localTagName(name)
}
