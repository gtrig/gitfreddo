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
Release builds bake `BITBUCKET_CLIENT_ID` / `BITBUCKET_CLIENT_SECRET` from GitHub Actions secrets into the main bundle.

## Connect with an app password

1. Open **Settings → Integrations**
2. Select **App password** mode on the Bitbucket card
3. Enter your Bitbucket username and app password
4. Click **Connect**

Create an app password in Bitbucket with **Account: Write** (needed for SSH key upload) plus repository / pull request access as needed. Credentials are stored locally using OS encryption.

If Bitbucket no longer offers app passwords, use an **API token with scopes** the same way (username + token in App password mode).

## SSH key upload

Bitbucket’s SSH keys API does **not** accept OAuth access tokens (only session, password, or app password / API token). Connect with **App password**, then click **Upload SSH key**.

OAuth still works for PRs, issues, and repo browsing — only SSH key upload needs app password.

## Using Bitbucket features

### Sidebar panels

With Bitbucket connected and a Bitbucket remote configured, the left sidebar shows:

- **Pull requests** — list, filter, create, merge
- **Issues** — list, create, update status (requires issue tracker enabled on the repo)

### Workspace hub

- **Clone a repository** — pick from your Bitbucket repos
- **Create on Bitbucket** — create a new repo in a workspace and clone it locally

### Add remote

With Bitbucket connected, **Remotes → Add remote** can browse your repositories or create a new repo and add it as a remote in one step.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not connected" after OAuth | Complete browser authorization; verify consumer callback URL and env vars |
| OAuth env error | Set both `BITBUCKET_CLIENT_ID` and `BITBUCKET_CLIENT_SECRET` |
| SSH upload 403 / “apppassword” only | Disconnect OAuth; reconnect with **App password** (or API token) |
| Push/clone still asks for password | Ensure the remote URL uses HTTPS with a connected account, or use SSH |
| Issues panel empty or error | Enable the issue tracker for the repository in Bitbucket settings, or migrate to Jira if Bitbucket returns “no longer available” (native issues are being retired) |
| PR list error “Invalid pagelen” | Update GitFreddo — older versions requested too many pull requests per page |
| Browse repos returns empty or 410 | Update GitFreddo — older versions used a retired Bitbucket list API |

## Next

- [GitHub integration](github.md)
- [Everyday Git workflow](../workflows/01-everyday.md)
