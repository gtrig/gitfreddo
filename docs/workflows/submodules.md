# Submodule workflows

GitFreddo supports git submodules in the sidebar **Submodules** section and in the working tree.

## Sidebar

- List submodules with status badges (`S`, `S+`, `S~`, `S?`)
- Add, initialize, update, sync, set URL, deinitialize, and remove
- Open a submodule as its own workspace tab (like worktrees)
- Section actions: **Update all**, **Sync all**

## Settings

Under **Settings → Git → Submodules**:

- **Clone / fetch / pull recursion** — `none`, `on-demand`, or `always`
- **Push recursion** — `no`, `check`, or `on-demand`

## Working tree

Submodule gitlinks show distinct badges. Context menu offers **Open submodule**, **Update**, and **Sync** instead of file-oriented actions.

## Repository files

Edit `.gitmodules` under **Settings → Git → Repository files**.
