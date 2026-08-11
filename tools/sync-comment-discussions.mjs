#!/usr/bin/env node

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { globby } from "globby"
import YAML from "yaml"

const root = process.cwd()
const contentDirectory = path.join(root, "content")
const markerPrefix = "<!-- quartz-post-id:"
const markerSuffix = " -->"

function parseArgs(argv) {
  const options = {
    apply: false,
    includeUncommitted: false,
    remote: false,
    paths: [],
  }

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === "--apply" || argument === "--write") {
      options.apply = true
      options.remote = true
    } else if (argument === "--remote") {
      options.remote = true
    } else if (argument === "--include-uncommitted") {
      options.includeUncommitted = true
    } else if (argument === "--path") {
      const value = argv[++index]
      if (!value) throw new Error("--path requires a content-relative path")
      options.paths.push(value.replaceAll("\\", "/").replace(/^content\//, ""))
    } else if (argument.startsWith("--path=")) {
      const value = argument.slice("--path=".length)
      if (!value) throw new Error("--path requires a content-relative path")
      options.paths.push(value.replaceAll("\\", "/").replace(/^content\//, ""))
    } else if (argument === "--help" || argument === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return options
}

function printHelp() {
  console.log(`Usage: node tools/sync-comment-discussions.mjs [options]

Synchronizes published Markdown pages with GitHub Discussions used by Giscus.
The default mode is read-only and does not contact GitHub.

Options:
  --remote             Read existing Discussions and recover matching numbers.
  --apply, --write     Create missing Discussions and write frontmatter mappings.
  --include-uncommitted
                       Also allow publish:true files with commit:false. This is
                       normally disabled so a remote Discussion is not created
                       for a file that will not be staged.
  --path <path>        Limit the operation to a content-relative Markdown path.
  -h, --help           Show this help.

Authentication for --remote/--apply uses the authenticated GitHub CLI (gh).
`)
}

function isEnabled(value) {
  return value === true || value === "true" || value === "yes" || value === 1
}

function isPublished(frontmatter) {
  return isEnabled(frontmatter.publish) && !isEnabled(frontmatter.draft)
}

function commentsEnabled(frontmatter) {
  return frontmatter.comments !== false && frontmatter.comments !== "false"
}

function normalizePostId(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function normalizeDiscussionNumber(value) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed
  }
  return undefined
}

function parseMarkdown(raw, source) {
  const openingLength = raw.startsWith("---\r\n") ? 5 : raw.startsWith("---\n") ? 4 : 0
  if (openingLength === 0) return { data: {}, hasFrontmatter: false }

  const rest = raw.slice(openingLength)
  const closing = rest.match(/(^|\r?\n)---[ \t]*(\r?\n|$)/)
  if (!closing || closing.index === undefined) {
    throw new Error(`Unclosed YAML frontmatter in ${source}`)
  }

  const sourceText = rest.slice(0, closing.index)
  const data = YAML.parse(sourceText) ?? {}
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Frontmatter must be a map in ${source}`)
  }

  return {
    data,
    hasFrontmatter: true,
    openingLength,
    closingIndex: closing.index,
    raw,
  }
}

function updateFrontmatter(raw, updates, source) {
  const parsed = parseMarkdown(raw, source)
  if (!parsed.hasFrontmatter) throw new Error(`Cannot add metadata without frontmatter: ${source}`)

  const data = { ...parsed.data }
  for (const [key, value] of Object.entries(updates)) data[key] = value

  const newline = raw.includes("\r\n") ? "\r\n" : "\n"
  const serialized = YAML.stringify(data).trimEnd().replaceAll("\n", newline)
  const closingOffset = parsed.openingLength + parsed.closingIndex
  return `${raw.slice(0, parsed.openingLength)}${serialized}${raw.slice(closingOffset)}`
}

function generatePostId() {
  return `post-${crypto.randomUUID()}`
}

function postIdMarker(postId) {
  return `${markerPrefix} ${postId}${markerSuffix}`
}

function titleFor(source, frontmatter) {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim() !== "") {
    return frontmatter.title.trim()
  }
  return path.posix.basename(source, ".md")
}

function discussionTitle(source, frontmatter) {
  const title = titleFor(source, frontmatter)
  const value = `댓글: ${title}`
  return value.length <= 256 ? value : `${value.slice(0, 253)}...`
}

function discussionBody(postId) {
  return [
    postIdMarker(postId),
    "<!-- Managed by the blog Publication Manager. Keep the post-id marker intact. -->",
    "",
    "이 Discussion은 블로그 글의 댓글을 저장하는 공간입니다.",
  ].join("\n")
}

function graphqlString(value) {
  return JSON.stringify(String(value))
}

function readConfig() {
  const configPath = path.join(root, "quartz.config.yaml")
  if (!fs.existsSync(configPath)) throw new Error(`Cannot find Quartz config: ${configPath}`)
  const config = YAML.parse(fs.readFileSync(configPath, "utf8")) ?? {}
  const plugin = (config.plugins ?? []).find(
    (entry) => typeof entry?.source === "string" && entry.source.endsWith("/comments"),
  )
  const options = plugin?.options?.options
  if (!options || plugin.enabled === false) {
    throw new Error("The enabled Giscus comments plugin is not configured in quartz.config.yaml")
  }

  const repo = typeof options.repo === "string" ? options.repo.trim() : ""
  const match = repo.match(/^([^/]+)\/([^/]+)$/)
  if (!match) throw new Error("Giscus repo must have the form owner/name")

  for (const key of ["repoId", "categoryId"]) {
    if (typeof options[key] !== "string" || options[key].trim() === "") {
      throw new Error(`Giscus ${key} is missing from quartz.config.yaml`)
    }
  }
  if (typeof options.category !== "string" || options.category.trim() === "") {
    throw new Error("Giscus category is missing from quartz.config.yaml")
  }

  return {
    owner: match[1],
    name: match[2],
    repo,
    repositoryId: options.repoId.trim(),
    category: options.category.trim(),
    categoryId: options.categoryId.trim(),
  }
}

function runGraphql(query) {
  const cli = process.env.GITHUB_CLI || "gh"
  const result = spawnSync(cli, ["api", "graphql", "-f", `query=${query}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  })

  if (result.error) throw new Error(`Unable to run ${cli}: ${result.error.message}`)
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || `${cli} api graphql failed with status ${result.status}`,
    )
  }

  let payload
  try {
    payload = JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(
      `GitHub CLI returned invalid JSON: ${error instanceof Error ? error.message : error}`,
    )
  }
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(
      payload.errors.map((entry) => entry.message ?? JSON.stringify(entry)).join("; "),
    )
  }
  return payload.data
}

function discussionsQuery(config, cursor) {
  const after = cursor ? `, after: ${graphqlString(cursor)}` : ""
  return `query { repository(owner: ${graphqlString(config.owner)}, name: ${graphqlString(config.name)}) { discussions(first: 100, categoryId: ${graphqlString(config.categoryId)}${after}) { nodes { number url title body } pageInfo { hasNextPage endCursor } } } }`
}

function loadRemoteDiscussions(config) {
  const discussions = []
  let cursor
  for (let page = 0; page < 20; page++) {
    const data = runGraphql(discussionsQuery(config, cursor))
    const connection = data?.repository?.discussions
    if (!connection) throw new Error("GitHub did not return the configured Discussion category")
    discussions.push(...(connection.nodes ?? []))
    if (!connection.pageInfo?.hasNextPage) return discussions
    cursor = connection.pageInfo.endCursor
    if (!cursor) throw new Error("GitHub returned hasNextPage without an endCursor")
  }
  throw new Error("Stopped after 20 Discussion pages; refusing an incomplete mapping")
}

function createDiscussion(config, source, frontmatter, postId) {
  const title = discussionTitle(source, frontmatter)
  const body = discussionBody(postId)
  const query = `mutation { createDiscussion(input: { repositoryId: ${graphqlString(config.repositoryId)}, categoryId: ${graphqlString(config.categoryId)}, title: ${graphqlString(title)}, body: ${graphqlString(body)} }) { discussion { number url title } } }`
  const data = runGraphql(query)
  const discussion = data?.createDiscussion?.discussion
  const number = normalizeDiscussionNumber(discussion?.number)
  if (!number) throw new Error("GitHub created a Discussion without returning a positive number")
  return { number, url: discussion.url, title: discussion.title }
}

function matchingDiscussions(discussions, postId) {
  const marker = postIdMarker(postId)
  return discussions.filter(
    (discussion) => typeof discussion.body === "string" && discussion.body.includes(marker),
  )
}

async function readPublishedNotes(paths) {
  if (!fs.existsSync(contentDirectory))
    throw new Error(`Cannot find content directory: ${contentDirectory}`)

  const configPath = path.join(root, "quartz.config.yaml")
  const quartzConfig = YAML.parse(fs.readFileSync(configPath, "utf8")) ?? {}
  const ignorePatterns = quartzConfig?.configuration?.ignorePatterns ?? []
  const files = (
    await globby("**/*.md", {
      cwd: contentDirectory,
      ignore: ["_publication/**", ...ignorePatterns],
      gitignore: true,
    })
  ).sort()

  const selected = paths.length > 0 ? files.filter((file) => paths.includes(file)) : files
  const notes = []
  for (const source of selected) {
    const absolutePath = path.join(contentDirectory, source)
    const raw = fs.readFileSync(absolutePath, "utf8")
    const parsed = parseMarkdown(raw, source)
    if (!isPublished(parsed.data) || !commentsEnabled(parsed.data)) continue
    notes.push({
      source,
      absolutePath,
      raw,
      data: parsed.data,
      postId: normalizePostId(parsed.data.postId),
      discussionNumber: normalizeDiscussionNumber(parsed.data.discussionNumber),
      commit: isEnabled(parsed.data.commit),
      title: titleFor(source, parsed.data),
    })
  }
  return notes
}

function validateNotes(notes) {
  const errors = []
  const postIds = new Map()
  const discussionNumbers = new Map()
  for (const note of notes) {
    if (Object.hasOwn(note.data, "postId") && !note.postId) {
      errors.push(`${note.source}: postId must be a non-empty string`)
    }
    if (Object.hasOwn(note.data, "discussionNumber") && note.discussionNumber === undefined) {
      errors.push(`${note.source}: discussionNumber must be a positive integer`)
    }
    if (note.postId) {
      const previous = postIds.get(note.postId)
      if (previous) errors.push(`Duplicate postId "${note.postId}": ${previous} and ${note.source}`)
      else postIds.set(note.postId, note.source)
    }
    if (note.discussionNumber !== undefined) {
      const previous = discussionNumbers.get(note.discussionNumber)
      if (previous) {
        errors.push(
          `Duplicate discussionNumber ${note.discussionNumber}: ${previous} and ${note.source}`,
        )
      } else {
        discussionNumbers.set(note.discussionNumber, note.source)
      }
      if (!note.postId) errors.push(`${note.source}: discussionNumber requires postId`)
    }
  }
  return errors
}

function writeUpdates(note, updates) {
  const current = fs.readFileSync(note.absolutePath, "utf8")
  if (current !== note.raw) {
    throw new Error(`Refusing to overwrite a file changed during sync: ${note.source}`)
  }
  const next = updateFrontmatter(current, updates, note.source)
  fs.writeFileSync(note.absolutePath, next)
  note.raw = next
  note.data = { ...note.data, ...updates }
  if (Object.hasOwn(updates, "postId")) note.postId = normalizePostId(updates.postId)
  if (Object.hasOwn(updates, "discussionNumber")) {
    note.discussionNumber = normalizeDiscussionNumber(updates.discussionNumber)
  }
}

function formatStatus(note, status, detail = "") {
  const suffix = detail ? ` — ${detail}` : ""
  return `${status.padEnd(18)} ${note.source}${suffix}`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const notes = await readPublishedNotes(options.paths)
  const errors = validateNotes(notes)
  if (errors.length > 0) {
    for (const error of errors) console.error(`Error: ${error}`)
    process.exitCode = 1
    return
  }

  let config
  let remoteDiscussions = []
  if (options.remote) {
    config = readConfig()
    remoteDiscussions = loadRemoteDiscussions(config)
  }

  console.log(`Published comment pages: ${notes.length}`)
  console.log(`Giscus repository: ${config?.repo ?? "not queried (use --remote or --apply)"}`)
  console.log(`Mode: ${options.apply ? "apply (remote create + local metadata)" : "dry-run"}`)
  console.log("")

  let linked = 0
  let candidates = 0
  let pending = 0
  let skipped = 0
  const applyErrors = []

  for (const note of notes) {
    if (!options.includeUncommitted && !note.commit) {
      skipped++
      console.log(formatStatus(note, "skipped", "publish:true but commit:false"))
      continue
    }

    if (note.discussionNumber !== undefined) {
      if (options.remote) {
        const matches = remoteDiscussions.filter(
          (discussion) => discussion.number === note.discussionNumber,
        )
        if (matches.length === 0) {
          pending++
          applyErrors.push(
            `${note.source}: discussionNumber ${note.discussionNumber} was not found in ${config.repo}`,
          )
          console.log(formatStatus(note, "error", `Discussion #${note.discussionNumber} not found`))
          continue
        }
      }
      linked++
      console.log(formatStatus(note, "linked", `Discussion #${note.discussionNumber}`))
      continue
    }

    candidates++
    if (!options.remote) {
      pending++
      console.log(formatStatus(note, "pending", "missing discussionNumber"))
      continue
    }

    let postId = note.postId
    if (!postId) {
      if (!options.apply) {
        pending++
        console.log(
          formatStatus(note, "pending", "postId and discussionNumber will be assigned on apply"),
        )
        continue
      }
      postId = generatePostId()
      try {
        writeUpdates(note, { postId })
        console.log(formatStatus(note, "assigned", `postId ${postId}`))
      } catch (error) {
        pending++
        applyErrors.push(error instanceof Error ? error.message : String(error))
        console.log(formatStatus(note, "error", "could not write postId"))
        continue
      }
    }

    const matches = matchingDiscussions(remoteDiscussions, postId)
    if (matches.length > 1) {
      pending++
      applyErrors.push(`${note.source}: more than one remote Discussion has marker ${postId}`)
      console.log(formatStatus(note, "error", `duplicate remote marker ${postId}`))
      continue
    }

    if (matches.length === 1) {
      const number = normalizeDiscussionNumber(matches[0].number)
      if (!number) {
        pending++
        applyErrors.push(`${note.source}: matching Discussion returned an invalid number`)
        console.log(formatStatus(note, "error", "invalid remote number"))
        continue
      }
      if (options.apply) {
        try {
          writeUpdates(note, { discussionNumber: number })
        } catch (error) {
          pending++
          applyErrors.push(error instanceof Error ? error.message : String(error))
          console.log(formatStatus(note, "error", "could not write discussionNumber"))
          continue
        }
      }
      linked++
      console.log(
        formatStatus(note, options.apply ? "recovered" : "recoverable", `Discussion #${number}`),
      )
      continue
    }

    if (!options.apply) {
      pending++
      console.log(
        formatStatus(note, "pending", `would create "${discussionTitle(note.source, note.data)}"`),
      )
      continue
    }

    try {
      const created = createDiscussion(config, note.source, note.data, postId)
      writeUpdates(note, { discussionNumber: created.number })
      remoteDiscussions.push({
        number: created.number,
        url: created.url,
        title: created.title,
        body: discussionBody(postId),
      })
      linked++
      console.log(formatStatus(note, "created", `Discussion #${created.number}`))
    } catch (error) {
      pending++
      applyErrors.push(error instanceof Error ? error.message : String(error))
      console.log(formatStatus(note, "error", "Discussion was not linked locally"))
    }
  }

  console.log("")
  console.log(`Linked: ${linked}`)
  console.log(`Candidates: ${candidates}`)
  console.log(`Pending: ${pending}`)
  console.log(`Skipped: ${skipped}`)

  if (!options.apply && pending > 0) {
    console.log("\nNo files or remote Discussions were changed.")
    console.log("Run npm run sync:comments:apply only after reviewing this list.")
  }

  for (const error of applyErrors) console.error(`Error: ${error}`)
  if (applyErrors.length > 0) process.exitCode = 1
}

export {
  discussionBody,
  discussionTitle,
  graphqlString,
  normalizeDiscussionNumber,
  normalizePostId,
  parseMarkdown,
  postIdMarker,
  updateFrontmatter,
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : ""
if (entryPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
