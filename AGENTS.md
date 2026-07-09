# AGENTS.md

## Project Shape

This repository is an Obsidian vault published with Quartz.

- Treat `content/` as the public note source that Quartz builds into the blog.
- Treat `.obsidian/`, `node_modules/`, `public/`, `.quartz-cache/`, `private/`, and `copilot/` as local/generated/private state. They are ignored by Git.
- Do not assume every untracked file under `content/` is intended for publication or commit.

## Writing Notes

- Keep Obsidian-compatible Markdown under `content/`.
- Prefer wikilinks for internal notes, for example `[[Some Note]]`.
- Use frontmatter on Markdown notes.
- Use only `created` as the default note date. The current Quartz config displays `created`.
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
- Quartz supports Obsidian wikilinks, callouts, Mermaid diagrams, LaTeX, code highlighting, tags, folder pages, backlinks, graph view, search, and table of contents.
- Use `publish: true` to include a note in the generated site. Notes without `publish: true` are hidden by `explicit-publish`.
- Use `draft: true` as an additional hard exclusion from the generated site.
- Use `commit: true` only to mark a note for the staging helper.
- Use `comments: false` to disable Giscus comments for a specific page.
- Use `enableToc: false` to hide the table of contents for a specific page.
- Use `description`, `socialDescription`, or `socialImage` when a page needs better previews.

## Commit Selection Policy

This repo uses frontmatter to decide which notes should be staged for commit.

- `commit: true` means the note is intentionally selected for Git staging by the local helper script.
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

If an asset reference is ambiguous or missing, do not guess silently. Surface the warning and ask the user or fix the reference.

## Git Safety

- Before staging or committing, run `git status --short` and inspect untracked content.
- If only selected notes should be committed, stage through `npm run stage:notes:apply` or explicit file paths.
- Do not revert or delete untracked notes unless the user explicitly asks.
- Remember that many notes under `content/분류 전/`, `content/archive/`, and similar folders may be local work-in-progress.

## Verification

- For staging behavior, run `npm run stage:notes` first and review the selected notes/assets.
- For script changes, run `node --check tools/stage-commit-notes.mjs`.
- For formatting changes to the staging helper, run `npx prettier package.json template/frontmatter.md tools/stage-commit-notes.mjs --check`.
