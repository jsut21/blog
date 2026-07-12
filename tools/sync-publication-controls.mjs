#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { globby } from "globby"
import YAML from "yaml"

const root = process.cwd()
const contentDirectory = path.join(root, "content")
const controlsDirectory = path.join(contentDirectory, "_publication")
const write = process.argv.includes("--write") || process.argv.includes("--apply")
const prune = process.argv.includes("--prune")

const managedFileTypes = [
  { suffix: ".excalidraw.md", contentType: "excalidraw" },
  { suffix: ".excalidraw", contentType: "excalidraw" },
  { suffix: ".canvas", contentType: "canvas" },
  { suffix: ".base", contentType: "base" },
]

function managedFileType(filePath) {
  const normalized = filePath.toLowerCase()
  return managedFileTypes.find(({ suffix }) => normalized.endsWith(suffix))
}

function parseFrontmatter(raw) {
  const openingLength = raw.startsWith("---\r\n") ? 5 : raw.startsWith("---\n") ? 4 : 0
  if (openingLength === 0) return {}

  const rest = raw.slice(openingLength)
  const closing = rest.match(/(^|\r?\n)---[ \t]*(\r?\n|$)/)
  if (!closing || closing.index === undefined) return {}

  const data = YAML.parse(rest.slice(0, closing.index)) ?? {}
  return typeof data === "object" && !Array.isArray(data) ? data : {}
}

function normalizeTarget(value) {
  if (typeof value !== "string") return undefined
  let target = value.trim().replaceAll("\\", "/")
  if (target.startsWith("[[") && target.endsWith("]]")) {
    target = target.slice(2, -2).split("|")[0]
  }
  return target.replace(/^\/+/, "").replace(/^content\//, "")
}

function controlFileName(target) {
  return `${target.replaceAll("/", "__")}.md`
}

function createdDate(filePath) {
  const stats = fs.statSync(filePath)
  const value = stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime
  return value.toISOString().slice(0, 10)
}

function renderControl(target) {
  const fileType = managedFileType(target)
  if (!fileType) throw new Error(`Unsupported publication target: ${target}`)

  const basename = path.posix.basename(target)
  const title = basename.slice(0, -fileType.suffix.length)
  const data = {
    title,
    created: createdDate(path.join(contentDirectory, target)),
    publication_control: true,
    content_type: fileType.contentType,
    target: `[[content/${target}]]`,
    publish: false,
    commit: false,
  }

  return `---\n${YAML.stringify(data).trimEnd()}\n---\n`
}

if (!fs.existsSync(contentDirectory)) {
  console.error(`Cannot find content directory: ${contentDirectory}`)
  process.exit(1)
}

const config = YAML.parse(fs.readFileSync(path.join(root, "quartz.config.yaml"), "utf8"))
const ignorePatterns = config?.configuration?.ignorePatterns ?? []
const targets = (
  await globby(["**/*.canvas", "**/*.base", "**/*.excalidraw", "**/*.excalidraw.md"], {
    cwd: contentDirectory,
    ignore: [...ignorePatterns, "_publication/**"],
    gitignore: true,
  })
).sort()

const controls = []
const controlPaths = await globby("_publication/**/*.md", { cwd: contentDirectory })
for (const controlPath of controlPaths) {
  const data = parseFrontmatter(fs.readFileSync(path.join(contentDirectory, controlPath), "utf8"))
  const target = normalizeTarget(data.target ?? data.asset)
  if (target) controls.push({ controlPath, target })
}

const existingTargets = new Set(controls.map((control) => control.target))
const targetSet = new Set(targets)
const missing = targets.filter((target) => !existingTargets.has(target))
const stale = controls.filter((control) => !targetSet.has(control.target))

console.log(`Managed files: ${targets.length}`)
console.log(`Existing controls: ${existingTargets.size}`)
console.log(`Missing controls: ${missing.length}`)
for (const target of missing) console.log(`  ${target}`)
console.log(`Stale controls: ${stale.length}`)
for (const control of stale) console.log(`  ${control.controlPath} -> ${control.target}`)

if (missing.length === 0 && stale.length === 0) process.exit(0)

if (!write && !prune) {
  if (missing.length > 0) {
    console.log("\nCreate the missing controls with:")
    console.log("  npm run sync:publication:apply")
  }
  if (stale.length > 0) {
    console.log("\nDelete stale controls with:")
    console.log("  npm run sync:publication:prune")
  }
  process.exit(0)
}

if (write && missing.length > 0) {
  fs.mkdirSync(controlsDirectory, { recursive: true })
  for (const target of missing) {
    fs.writeFileSync(path.join(controlsDirectory, controlFileName(target)), renderControl(target), {
      flag: "wx",
    })
  }
  console.log(`\nCreated ${missing.length} publication control(s).`)
}

if (prune && stale.length > 0) {
  for (const control of stale) {
    fs.unlinkSync(path.join(contentDirectory, control.controlPath))
  }
  console.log(`\nDeleted ${stale.length} stale publication control(s).`)
}
