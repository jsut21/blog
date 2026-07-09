#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { spawnSync } from "node:child_process"
import YAML from "yaml"

const root = process.cwd()
const contentDir = path.join(root, "content")

const assetExtensions = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
  ".mp3",
  ".mp4",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
  ".mov",
  ".m4a",
  ".pdf",
])

function parseArgs(argv) {
  const opts = {
    stage: false,
    key: "commit",
    verbose: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--stage" || arg === "--apply") {
      opts.stage = true
    } else if (arg === "--verbose") {
      opts.verbose = true
    } else if (arg === "--key") {
      opts.key = argv[++i] ?? opts.key
    } else if (arg.startsWith("--key=")) {
      opts.key = arg.slice("--key=".length)
    } else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      console.error(`Unknown argument: ${arg}`)
      printHelp()
      process.exit(1)
    }
  }

  return opts
}

function printHelp() {
  console.log(`Usage: node tools/stage-commit-notes.mjs [options]

Stages Markdown notes under content/ whose frontmatter has commit: true.
Referenced local assets are staged with the selected notes.

Options:
  --stage, --apply   Run git add. Without this, only prints a dry run.
  --key <name>       Frontmatter boolean key to read. Default: commit
  --verbose          Print skipped references.
  -h, --help         Show this help.
`)
}

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(abs))
    } else if (entry.isFile()) {
      out.push(abs)
    }
  }
  return out
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/")
}

function relFromRoot(abs) {
  return toPosix(path.relative(root, abs))
}

function relFromContent(abs) {
  return toPosix(path.relative(contentDir, abs))
}

function normalizeTarget(target) {
  let value = target.trim()

  if (value.startsWith("<") && value.endsWith(">")) {
    value = value.slice(1, -1).trim()
  }

  value = value.replaceAll("\\", "/")
  value = value.split("#")[0].split("?")[0].trim()

  try {
    value = decodeURIComponent(value)
  } catch {
    // Keep the original value when it is not percent-encoded.
  }

  return value
}

function stripObsidianEmbedTarget(raw) {
  return normalizeTarget(raw.split("|")[0])
}

function stripMarkdownImageTarget(raw) {
  let value = raw.trim()

  if (value.startsWith("<")) {
    const close = value.indexOf(">")
    if (close >= 0) {
      return normalizeTarget(value.slice(1, close))
    }
  }

  const titleMatch = value.match(/^(.+?)(?:\s+["'][^"']*["'])$/)
  if (titleMatch) {
    value = titleMatch[1]
  }

  return normalizeTarget(value)
}

function isExternalTarget(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)
}

function isAssetTarget(target) {
  const ext = path.extname(target).toLowerCase()
  return assetExtensions.has(ext)
}

function frontmatterAssetTargets(data) {
  const values = []
  const keys = ["assets", "asset", "socialImage", "image", "cover"]

  function collect(value) {
    if (typeof value === "string") {
      values.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) collect(item)
    }
  }

  for (const key of keys) {
    collect(data[key])
  }

  return values
}

function markdownAssetTargets(content) {
  const values = []

  const obsidianEmbed = /!\[\[([^\]\n]+)\]\]/g
  for (const match of content.matchAll(obsidianEmbed)) {
    values.push(stripObsidianEmbedTarget(match[1]))
  }

  const markdownImage = /!\[[^\]\n]*\]\((<[^>\n]+>|[^)\n]+)\)/g
  for (const match of content.matchAll(markdownImage)) {
    values.push(stripMarkdownImageTarget(match[1]))
  }

  const htmlImage = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  for (const match of content.matchAll(htmlImage)) {
    values.push(normalizeTarget(match[1]))
  }

  return values
}

function parseMarkdown(raw, filePath) {
  const startLength = raw.startsWith("---\r\n") ? 5 : raw.startsWith("---\n") ? 4 : 0
  if (startLength === 0) {
    return { data: {}, content: raw }
  }

  const rest = raw.slice(startLength)
  const close = rest.match(/(^|\r?\n)---[ \t]*(\r?\n|$)/)
  if (!close || close.index === undefined) {
    return { data: {}, content: raw }
  }

  const frontmatter = rest.slice(0, close.index)
  const content = raw.slice(startLength + close.index + close[0].length)

  try {
    const data = YAML.parse(frontmatter) ?? {}
    return {
      data: typeof data === "object" && !Array.isArray(data) ? data : {},
      content,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid YAML frontmatter in ${relFromRoot(filePath)}: ${message}`)
  }
}

function buildFileIndex(files) {
  const byContentRel = new Map()
  const byBasename = new Map()

  for (const abs of files) {
    const contentRel = relFromContent(abs)
    byContentRel.set(contentRel, abs)

    const basename = path.basename(abs)
    const existing = byBasename.get(basename) ?? []
    existing.push(abs)
    byBasename.set(basename, existing)
  }

  return { byContentRel, byBasename }
}

function existingFile(candidate) {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : undefined
}

function resolveAsset(target, noteAbs, index, warnings, verbose) {
  const normalized = normalizeTarget(target)
  if (!normalized) return undefined

  if (isExternalTarget(normalized)) {
    if (verbose) warnings.push(`Skipped external asset reference: ${normalized}`)
    return undefined
  }

  if (!isAssetTarget(normalized)) {
    if (verbose) warnings.push(`Skipped non-asset reference: ${normalized}`)
    return undefined
  }

  const noteDir = path.dirname(noteAbs)
  const directCandidates = []

  if (path.isAbsolute(normalized)) {
    directCandidates.push(path.join(contentDir, normalized.slice(1)))
    directCandidates.push(path.join(root, normalized.slice(1)))
  } else {
    directCandidates.push(path.resolve(noteDir, normalized))
    directCandidates.push(path.resolve(contentDir, normalized))
  }

  for (const candidate of directCandidates) {
    const found = existingFile(candidate)
    if (found) return found
  }

  const contentRel = toPosix(normalized)
  if (index.byContentRel.has(contentRel)) {
    return index.byContentRel.get(contentRel)
  }

  const suffixMatches = []
  for (const [rel, abs] of index.byContentRel.entries()) {
    if (rel.endsWith(`/${contentRel}`)) {
      suffixMatches.push(abs)
    }
  }
  if (suffixMatches.length === 1) return suffixMatches[0]
  if (suffixMatches.length > 1) {
    warnings.push(
      `Ambiguous asset reference "${normalized}" in ${relFromRoot(noteAbs)}: ${suffixMatches
        .map(relFromRoot)
        .join(", ")}`,
    )
    return undefined
  }

  const basenameMatches = index.byBasename.get(path.basename(normalized)) ?? []
  if (basenameMatches.length === 1) return basenameMatches[0]
  if (basenameMatches.length > 1) {
    warnings.push(
      `Ambiguous asset basename "${normalized}" in ${relFromRoot(noteAbs)}: ${basenameMatches
        .map(relFromRoot)
        .join(", ")}`,
    )
    return undefined
  }

  warnings.push(`Missing asset "${normalized}" referenced by ${relFromRoot(noteAbs)}`)
  return undefined
}

function isEnabled(value) {
  return value === true || value === "true" || value === "yes" || value === 1
}

function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(contentDir)) {
    console.error(`Cannot find content directory: ${contentDir}`)
    process.exit(1)
  }

  const allFiles = walk(contentDir)
  const markdownFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === ".md")
  const index = buildFileIndex(allFiles)

  const notes = new Set()
  const assets = new Set()
  const warnings = []

  for (const noteAbs of markdownFiles) {
    const raw = fs.readFileSync(noteAbs, "utf8")
    const parsed = parseMarkdown(raw, noteAbs)

    if (!isEnabled(parsed.data[opts.key])) continue

    notes.add(noteAbs)

    const targets = [
      ...frontmatterAssetTargets(parsed.data),
      ...markdownAssetTargets(parsed.content),
    ]

    for (const target of targets) {
      const asset = resolveAsset(target, noteAbs, index, warnings, opts.verbose)
      if (asset) assets.add(asset)
    }
  }

  const noteList = [...notes].sort()
  const assetList = [...assets].filter((asset) => !notes.has(asset)).sort()
  const filesToStage = [...noteList, ...assetList]
  const relNotes = noteList.map(relFromRoot)
  const relAssets = assetList.map(relFromRoot)
  const relFiles = filesToStage.map(relFromRoot)

  console.log(`Frontmatter key: ${opts.key}: true`)
  console.log(`Mode: ${opts.stage ? "stage" : "dry-run"}`)
  console.log("")

  console.log(`Selected notes (${relNotes.length}):`)
  for (const file of relNotes) console.log(`  ${file}`)
  if (relNotes.length === 0) console.log("  (none)")
  console.log("")

  console.log(`Referenced assets (${relAssets.length}):`)
  for (const file of relAssets) console.log(`  ${file}`)
  if (relAssets.length === 0) console.log("  (none)")
  console.log("")

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`)
    for (const warning of warnings) console.log(`  - ${warning}`)
    console.log("")
  }

  if (relFiles.length === 0) {
    console.log("Nothing to stage.")
    return
  }

  if (!opts.stage) {
    console.log("Dry run only. To stage these files, run:")
    console.log("  npm run stage:notes:apply")
    return
  }

  const result = spawnSync("git", ["add", "--", ...relFiles], {
    cwd: root,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  console.log(`Staged ${relFiles.length} file(s).`)
}

main()
