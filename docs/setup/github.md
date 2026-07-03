# GitHub integration

Connect GitHub to browse repositories, manage pull requests and issues, and authenticate git operations over HTTPS.

Open **Settings → Integrations** to configure.

## What GitHub unlocks

- Browse, create, and fork repositories from the workspace hub
- Pull request list, create, and merge in the sidebar
- Issue list, create, and update in the sidebar
- Authenticated git operations when cloning or pushing to GitHub

## Connect with OAuth (recommended)

1. Open **Settings → Integrations**
2. Select **OAuth** mode
3. Click **Connect**
4. GitFreddo displays a **user code** and **verification URI**
5. Open the URI in your browser, enter the code, and authorize the app
6. Return to GitFreddo — you should see your username and avatar

### Custom OAuth app

By default GitFreddo uses a bundled OAuth client ID. For your own app:

1. Create a GitHub OAuth App with **Device Flow** enabled and `repo` scope
2. Set `GITHUB_CLIENT_ID` in the environment or project `.env` file

```bash
GITHUB_CLIENT_ID=your_oauth_app_client_id
```

### GitHub Enterprise

For GitHub Enterprise Server, set the hostname:

```bash
GITHUB_ENTERPRISE_HOST=github.mycompany.com
```

## Connect with a personal access token (PAT)

1. Open **Settings → Integrations**
2. Select **PAT** mode
3. Paste a token with at least `repo` scope
4. Click **Connect**

PATs are stored locally in `~/.config/gitfreddo/settings.json`.

## SSH key upload

After connecting, click **Upload SSH key** to add a generated key to your GitHub account. Useful when you prefer SSH remotes.

## Using GitHub features

### Sidebar panels

With GitHub connected, the left sidebar shows:

- **Pull requests** — list, filter, create, merge
- **Issues** — list, create, update status

### Workspace hub

- **Clone a repository** — pick from your GitHub repos
- **Create on GitHub** — create a new repo and clone it locally

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not connected" after OAuth | Complete the browser authorization; check network and client ID |
| Token expired | Disconnect and reconnect with a fresh PAT |
| Enterprise host errors | Verify `GITHUB_ENTERPRISE_HOST` matches your server hostname |
| Push/clone still asks for password | Ensure the remote URL uses HTTPS with a connected account, or use SSH |

## Next

- [Everyday Git workflow](../workflows/01-everyday.md) — push your first commit
- [Remotes and sync](../workflows/03-remotes-and-sync.md) — fetch, pull, and push
