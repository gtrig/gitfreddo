import { createForgeTokenStore } from '../forge/token-store'

const store = createForgeTokenStore('github-token.enc', 'GitHub')

export const saveGitHubToken = store.saveToken
export const loadGitHubToken = store.loadToken
export const clearGitHubToken = store.clearToken
export const hasGitHubToken = store.hasToken
