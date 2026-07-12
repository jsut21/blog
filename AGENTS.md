# AGENTS.md

## Project Shape

This repository is an Obsidian vault published with Quartz.

- Treat `content/` as the public note source that Quartz builds into the blog.
- Treat `.obsidian/`, `node_modules/`, `public/`, `.quartz-cache/`, `private/`, and `copilot/` as local/generated/private state. They are ignored by Git.
- Treat `content/분류 전/`, `content/archive/`, and `content/claude code 활용/` as WIP note areas. Quartz ignores them for publication, though Git may still track files there when explicitly committed.
- Treat `content/_publication/` as technical Markdown control records for non-Markdown pages. Quartz reads their state but never emits the control records as pages.
- Do not assume every untracked file under `content/` is intended for publication or commit.

## Writing Notes

- Keep Obsidian-compatible Markdown under `content/`.
- Prefer wikilinks for internal notes, for example `[[Some Note]]`.
- Use frontmatter on Markdown notes.
- Use only `created` as the default note date. The current Quartz config displays `created`.
- Do not repeat the frontmatter `title` as an H1 in the body. Quartz renders it as the page H1; start body sections at H2.
- New notes should default to `publish: false` and `commit: false` until the user explicitly marks them for publication or commit.

Recommended frontmatter shape:

```yaml
---
title: Note title
created: YYYY-MM-DD
draft: false
publish: false
commit: false
tags:
  - topic/example
---
```

## Quartz Writing Rules

- Quartz builds the blog from `content/`.
- Quartz supports Obsidian wikilinks, callouts, Mermaid diagrams, LaTeX, Excalidraw, code highlighting, tags, folder pages, backlinks, graph view, search, and table of contents.
- Use `publish: true` to include a note in the generated site. Notes without `publish: true` are hidden by `explicit-publish`.
- Use `draft: true` as an additional hard exclusion from the generated site.
- Use `commit: true` only to mark a note for the staging helper.
- Use `comments: false` to disable Giscus comments for a specific page.
- Use `enableToc: false` to hide the table of contents for a specific page.
- Use `description`, `socialDescription`, or `socialImage` when a page needs better previews.
- Use `PUBLICATION-MANAGER.base` to edit publication and staging state across Markdown, Canvas, Base, and Excalidraw content.

## Cornell Notes

- Enable the layout with `cornell: true` in frontmatter.
- Keep concepts and direct information in normal body blocks.
- Attach a question, answer, reflection, or related note by giving the body block an ASCII block ID and using the same ID as callout metadata.

```md
The primary concept belongs in the body. ^concept-id

> [!question|concept-id] Why does this matter?
> The question and its answer belong in the callout.
```

- Block IDs may contain Latin letters, numbers, and hyphens.
- Put an anchored callout directly after its target block so the source remains easy to follow.
- Use an unanchored `[!summary]` at the end of the note for the full-width summary.

## Publication Policy By File Type

- Markdown notes are published only when they are outside Quartz ignored paths, have `publish: true`, and do not have `draft: true`.
- `commit: true` is only for Git staging. It does not publish a note.
- Current Quartz ignored WIP paths include `content/분류 전/`, `content/archive/`, and `content/claude code 활용/`.
- `.canvas`, `.base`, `.excalidraw`, and `.excalidraw.md` files require a matching Markdown record under `content/_publication/`. Quartz renders them only when that record has `publish: true` and does not have `draft: true`.
- The local `publication-manager-sync` Obsidian plugin creates, renames, and trashes those control records as managed files change.
- Use `npm run sync:publication`, `npm run sync:publication:apply`, and `npm run sync:publication:prune` as command-line verification and recovery tools when Obsidian is not running.
- Assets under non-ignored `content/` paths can still be copied by Quartz. Keep private or WIP assets in ignored paths or outside `content/`.

## Commit Selection Policy

This repo uses frontmatter to decide which notes should be staged for commit.

- `commit: true` means the note is intentionally selected for Git staging by the local helper script.
- For a Canvas/Base/Excalidraw control record, `commit: true` stages both the control Markdown and the file referenced by its `target` property.
- `commit: false` or a missing `commit` field means the note should not be staged by broad content commands.
- `publish: true` and `draft: true` only control Quartz publication. They do not control Git staging or commits.
- Never use broad commands like `git add content`, `git add content/분류 전`, or `git add .` for note commits unless the user explicitly asks for that exact broad scope.
- Prefer `npm run stage:notes` to preview selected notes and referenced assets.
- Use `npm run stage:notes:apply` to stage only notes with `commit: true` and their referenced local assets.

The staging helper is `tools/stage-commit-notes.mjs`.

## Asset Handling

When a note has `commit: true`, referenced local assets should be committed with it.

The staging helper detects local assets from:

- Obsidian embeds such as `![[image.png]]` and `![[image.png|500x300]]`.
- Markdown images such as `![alt](./image.png)`.
- HTML images such as `<img src="./image.png">`.
- Frontmatter fields: `assets`, `asset`, `socialImage`, `image`, and `cover`.
- The `target` frontmatter link on a `publication_control: true` record.

If an asset reference is ambiguous or missing, do not guess silently. Surface the warning and ask the user or fix the reference.

## Git Safety

- Before staging or committing, run `git status --short` and inspect untracked content.
- If only selected notes should be committed, stage through `npm run stage:notes:apply` or explicit file paths.
- Do not revert or delete untracked notes unless the user explicitly asks.
- Remember that many notes under `content/분류 전/`, `content/archive/`, and similar folders may be local work-in-progress.

## Verification

- For staging behavior, run `npm run stage:notes` first and review the selected notes/assets.
- For Canvas/Base/Excalidraw coverage, run `npm run sync:publication` and confirm that no control records are missing.
- For script changes, run `node --check tools/stage-commit-notes.mjs`.
- For publication-control changes, run `node --check tools/sync-publication-controls.mjs`, `npx tsc --noEmit`, and `npx quartz build`.
- For the publication Obsidian plugin, run `node --check .obsidian/plugins/publication-manager-sync/main.js`.
- For Cornell Reading View, run `node --check .obsidian/plugins/cornell-anchored-callouts/main.js` and validate its manifest and enabled-plugin JSON.
- For formatting changes to the staging helpers, run `npx prettier package.json template/frontmatter.md tools/stage-commit-notes.mjs tools/sync-publication-controls.mjs --check`.
