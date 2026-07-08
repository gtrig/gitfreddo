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

1. Create a GitHub OAuth App with **Device Flow** enabled
2. Set `GITHUB_CLIENT_ID` in the project-root `.env` file (or export it in your shell), then **restart** the app

GitFreddo requests `repo`, `admin:public_key`, and `workflow` during device authorization (SSH key upload and pushing Actions workflow files).

```bash
GITHUB_CLIENT_ID=your_oauth_app_client_id
```

GitFreddo loads unprefixed keys from `.env` into the Electron main process at startup.
Release builds bake the same values from CI secrets (`GITFREDDO_GITHUB_CLIENT_ID` — Actions forbids secrets named `GITHUB_*`) into the main bundle.

### GitHub Enterprise

For GitHub Enterprise Server, set the hostname:

```bash
GITHUB_ENTERPRISE_HOST=github.mycompany.com
```

## Connect with a personal access token (PAT)

1. Open **Settings → Integrations**
2. Select **PAT** mode
3. Paste a token with at least `repo` scope. For **Upload SSH key**, classic PATs also need `admin:public_key` (fine-grained: account permission to manage SSH keys)
4. Click **Connect**

PATs are stored locally in your GitFreddo settings file (see [settings location](../getting-started.md#settings-location)).

## SSH key upload

After connecting with a token that includes `admin:public_key`, click **Upload SSH key** to add a generated key to your GitHub account. Useful when you prefer SSH remotes.

If upload returns **404 Not Found**, the token is missing `admin:public_key` — disconnect and reconnect (OAuth) or create a PAT that includes that scope.

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
| Push rejected: OAuth App cannot update workflow without `workflow` scope | Disconnect and reconnect GitHub OAuth so the token includes `workflow`; or push via SSH |
| SSH upload 404 Not Found | Reconnect OAuth (or PAT with `admin:public_key`); GitHub hides unauthorized key endpoints as 404 |
| Enterprise host errors | Verify `GITHUB_ENTERPRISE_HOST` matches your server hostname |
| Push/clone still asks for password | Ensure the remote URL uses HTTPS with a connected account, or use SSH |

## Next

- [Everyday Git workflow](../workflows/01-everyday.md) — push your first commit
- [Remotes and sync](../workflows/03-remotes-and-sync.md) — fetch, pull, and push
