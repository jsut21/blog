# Blog Migration Status

This directory is the canonical local workspace for the migrated blog.

## Migration source

- Previous Git checkout: `/home/lis/Desktop/blog`
- Source Vault used during integration: `/home/lis/Desktop/obsidian vault`
- Previous checkout remains on disk and has not been deleted or reset.
- Its uncommitted working-tree changes were not rewritten during this move.

## Migration boundary

- The current migrated tree under `content/` is the new working state.
- Quartz, publication-manager controls, templates, assets, and local plugins
  remain in this workspace.
- `.obsidian/`, `.claudian/`, `.hinote/`, `.infio_json_db/`, generated output,
  and other local state are excluded from Git.
- No remote push is performed by the migration.

## Verification gates

- `npm run sync:publication` reports no missing publication controls.
- `node --check .obsidian/plugins/publication-manager-sync/main.js` passes.
- `npx tsc --noEmit` passes.
- Quartz build succeeds from this directory.
- Publication Manager compares the working tree against Git `HEAD` after the
  migration baseline commit.
