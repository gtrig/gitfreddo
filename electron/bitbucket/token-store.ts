import { createForgeTokenStore } from '../forge/token-store'

const store = createForgeTokenStore('bitbucket-token.enc', 'Bitbucket')

export const saveBitbucketToken = store.saveToken
export const loadBitbucketToken = store.loadToken
export const clearBitbucketToken = store.clearToken
export const hasBitbucketToken = store.hasToken
