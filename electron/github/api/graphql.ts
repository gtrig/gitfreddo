import { getGitHubApiBase, getGitHubTokenOrThrow } from './http'

export function getGitHubGraphqlUrl(): string {
  const apiBase = getGitHubApiBase()
  if (apiBase.endsWith('/api/v3')) {
    return apiBase.replace(/\/api\/v3$/, '/api/graphql')
  }
  return `${apiBase}/graphql`
}

export async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string
): Promise<T> {
  const accessToken = token ?? (await getGitHubTokenOrThrow())
  const response = await fetch(getGitHubGraphqlUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub GraphQL error (${response.status}): ${detail}`)
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '))
  }
  if (!payload.data) {
    throw new Error('GitHub GraphQL returned no data')
  }

  return payload.data
}
