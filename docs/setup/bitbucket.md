# Bitbucket integration

Connect Bitbucket Cloud to browse repositories, manage pull requests and issues, and authenticate git operations over HTTPS.

Open **Settings → Integrations** to configure.

## What Bitbucket unlocks

- Browse, create, and fork repositories from the workspace hub
- Pull request list, create, and merge in the sidebar
- Issue list, create, and update in the sidebar (when the issue tracker is enabled)
- Authenticated git operations when cloning or pushing to Bitbucket over HTTPS

## Connect with OAuth

1. Open **Settings → Integrations**
2. Select **OAuth** mode on the Bitbucket card
3. Click **Connect**
4. GitFreddo opens your browser to Bitbucket for authorization
5. After approving access, return to GitFreddo — you should see your username and avatar

### Custom OAuth consumer

Bitbucket Cloud OAuth requires a consumer with a callback URL. For GitFreddo:

1. Create a Bitbucket OAuth consumer in your workspace settings
2. Set the callback URL to `http://127.0.0.1:8765/callback`
3. Enable scopes: `account`, `repository`, `repository:write`, `pullrequest`, `pullrequest:write`, `issue`, `issue:write`
4. Set these in the project-root `.env` file (or export them in your shell), then **restart** the app:

```bash
BITBUCKET_CLIENT_ID=your_consumer_key
BITBUCKET_CLIENT_SECRET=your_consumer_secret
```

GitFreddo loads unprefixed keys from `.env` into the Electron main process at startup.

## Connect with an app password

1. Open **Settings → Integrations**
2. Select **App password** mode on the Bitbucket card
3. Enter your Bitbucket username and app password
4. Click **Connect**

Create an app password in Bitbucket with repository read/write permissions. Credentials are stored locally using OS encryption.

## SSH key upload

After connecting, click **Upload SSH key** to add a generated key to your Bitbucket account. Useful when you prefer SSH remotes.

## Using Bitbucket features

### Sidebar panels

With Bitbucket connected and a Bitbucket remote configured, the left sidebar shows:

- **Pull requests** — list, filter, create, merge
- **Issues** — list, create, update status (requires issue tracker enabled on the repo)

### Workspace hub

- **Clone a repository** — pick from your Bitbucket repos
- **Create on Bitbucket** — create a new repo in a workspace and clone it locally

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not connected" after OAuth | Complete browser authorization; verify consumer callback URL and env vars |
| OAuth env error | Set both `BITBUCKET_CLIENT_ID` and `BITBUCKET_CLIENT_SECRET` |
| Push/clone still asks for password | Ensure the remote URL uses HTTPS with a connected account, or use SSH |
| Issues panel empty or error | Enable the issue tracker for the repository in Bitbucket settings |

## Next

- [GitHub integration](github.md)
- [Everyday Git workflow](../workflows/01-everyday.md)
