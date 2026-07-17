# GitLab integration

Connect GitLab (gitlab.com or self-managed) to browse projects, manage merge requests and issues, and authenticate git operations over HTTPS.

Open **Settings → Integrations** to configure.

## What GitLab unlocks

- Browse, create, and fork projects from the workspace hub
- Merge request list, create, and merge in the sidebar
- Issue list, create, and update in the sidebar
- Authenticated git operations when cloning or pushing to GitLab

## Connect with OAuth (recommended)

1. Open **Settings → Integrations**
2. Optionally enter your **self-managed host** (leave blank for gitlab.com)
3. Select **OAuth** mode
4. Click **Connect**
5. GitFreddo opens your browser to authorize the app
6. Return to GitFreddo — you should see your username and avatar

### Custom OAuth app

By default GitFreddo uses a bundled OAuth client ID and secret (baked into release builds from CI secrets). For your own app:

1. Register an OAuth application under **User Settings → Applications** on your GitLab instance
2. Set redirect URI to `http://127.0.0.1:8785/callback` (GitFreddo scans nearby ports if 8785 is busy)
3. Set `GITLAB_CLIENT_ID` and `GITLAB_CLIENT_SECRET` in the project-root `.env` file, then **restart** the app

GitFreddo requests `api` and `read_user` scopes during authorization.

```bash
GITLAB_CLIENT_ID=your_application_id
GITLAB_CLIENT_SECRET=your_application_secret
```

Release builds bake the same values from GitHub Actions **repository** secrets (`GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`) into the main bundle. Names must match exactly; Environment secrets are not used unless the workflow sets `environment:`. The release job fails if these are missing so installers cannot ship blank credentials.

### Self-managed GitLab

For a private GitLab instance, set the hostname:

```bash
GITLAB_HOST=gitlab.mycompany.com
```

You can also set the host in **Settings → Integrations** before connecting.

## Connect with a personal access token (PAT)

1. Open **Settings → Integrations**
2. Optionally enter your **self-managed host**
3. Select **PAT** mode
4. Paste a token with at least `api` scope (and `read_user` for profile display)
5. Click **Connect**

PATs are stored locally in an encrypted file (see [settings location](../getting-started.md#settings-location)).

## SSH key upload

After connecting, click **Upload SSH key** to add a generated key to your GitLab account. Useful when you prefer SSH remotes.

## Using GitLab features

### Sidebar panels

With GitLab connected, the left sidebar shows:

- **Merge requests** — list, create, merge (opens in browser for detail)
- **Issues** — list, create, update status

### Workspace hub

- **Clone a repository** — pick from your GitLab projects
- **Create on GitLab** — create a new project and clone it locally

### Add remote

With GitLab connected, **Remotes → Add remote** can browse your projects or create a new project and add it as a remote in one step.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not connected" after OAuth | Complete the browser authorization; check network and client ID/secret |
| OAuth redirect fails | Ensure redirect URI matches `http://127.0.0.1:8785/callback` in your GitLab app |
| Self-managed host not detected | Set `GITLAB_HOST` or the host field in Settings before connecting |
| HTTPS push asks for password | Connect GitLab in Settings so GitFreddo can inject credentials |
| SSH key upload fails | Ensure token has `api` scope and SSH keys API access |
