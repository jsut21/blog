#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { globby } from "globby"
import YAML from "yaml"

const root = process.cwd()
const contentDirectory = path.join(root, "content")
const requireDiscussions = process.argv.includes("--require-discussions")

function parseFrontmatter(raw, source) {
  const openingLength = raw.startsWith("---\r\n") ? 5 : raw.startsWith("---\n") ? 4 : 0
  if (openingLength === 0) return {}

  const rest = raw.slice(openingLength)
  const closing = rest.match(/(^|\r?\n)---[ \t]*(\r?\n|$)/)
  if (!closing || closing.index === undefined) return {}

  const data = YAML.parse(rest.slice(0, closing.index)) ?? {}
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Frontmatter must be a map: ${source}`)
  }
  return data
}

function isPublished(data) {
  return data.publish === true && data.draft !== true
}

function commentsEnabled(data) {
  return data.comments !== false && data.comments !== "false"
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

if (!fs.existsSync(contentDirectory)) {
  console.error(`Cannot find content directory: ${contentDirectory}`)
  process.exit(1)
}

const configPath = path.join(root, "quartz.config.yaml")
const config = fs.existsSync(configPath) ? YAML.parse(fs.readFileSync(configPath, "utf8")) : {}
const ignorePatterns = config?.configuration?.ignorePatterns ?? []
const files = (
  await globby("**/*.md", {
    cwd: contentDirectory,
    ignore: ["_publication/**", ...ignorePatterns],
    gitignore: true,
  })
).sort()

const errors = []
const warnings = []
const publishedPages = []
const postIds = new Map()
const discussionNumbers = new Map()

for (const relativePath of files) {
  const source = relativePath.split(path.sep).join("/")
  let data
  try {
    data = parseFrontmatter(
      fs.readFileSync(path.join(contentDirectory, relativePath), "utf8"),
      source,
    )
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    continue
  }

  const postId = normalizePostId(data.postId)
  const hasPostIdValue = Object.hasOwn(data, "postId")
  const discussionNumber = normalizeDiscussionNumber(data.discussionNumber)
  const hasDiscussionValue = Object.hasOwn(data, "discussionNumber")

  if (hasPostIdValue && !postId) {
    errors.push(`${source}: postId must be a non-empty string`)
  }
  if (hasDiscussionValue && discussionNumber === undefined) {
    errors.push(`${source}: discussionNumber must be a positive integer`)
  }

  if (postId) {
    const previous = postIds.get(postId)
    if (previous) errors.push(`Duplicate postId "${postId}": ${previous} and ${source}`)
    else postIds.set(postId, source)
  }
  if (discussionNumber !== undefined) {
    const previous = discussionNumbers.get(discussionNumber)
    if (previous) {
      errors.push(`Duplicate discussionNumber ${discussionNumber}: ${previous} and ${source}`)
    } else {
      discussionNumbers.set(discussionNumber, source)
    }
    if (!postId) errors.push(`${source}: discussionNumber requires postId`)
  }

  if (!isPublished(data) || !commentsEnabled(data)) continue
  publishedPages.push({ source, postId, discussionNumber })
  if (!postId) warnings.push(`${source}: published comment page has no postId`)
  if (discussionNumber === undefined) {
    const message = `${source}: published comment page has no discussionNumber`
    if (requireDiscussions) errors.push(message)
    else warnings.push(message)
  }
}

console.log(`Published comment pages: ${publishedPages.length}`)
console.log(`postId assignments: ${publishedPages.filter(({ postId }) => postId).length}`)
console.log(
  `discussionNumber assignments: ${publishedPages.filter(({ discussionNumber }) => discussionNumber !== undefined).length}`,
)

for (const warning of warnings) console.warn(`Warning: ${warning}`)
for (const error of errors) console.error(`Error: ${error}`)

if (errors.length > 0) process.exit(1)
