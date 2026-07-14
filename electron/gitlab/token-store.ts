import { createForgeTokenStore } from '../forge/token-store'

const store = createForgeTokenStore('gitlab-token.enc', 'GitLab')

export const saveGitlabToken = store.saveToken
export const loadGitlabToken = store.loadToken
export const clearGitlabToken = store.clearToken
export const hasGitlabToken = store.hasToken
