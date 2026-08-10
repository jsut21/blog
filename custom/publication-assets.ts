import fs from "node:fs"
import path from "node:path"

import type { ProcessedContent } from "../quartz/plugins/vfile"
import type { ChangeEvent, QuartzEmitterPlugin } from "../quartz/plugins/types"
import { glob } from "../quartz/util/glob"
import type { BuildCtx } from "../quartz/util/ctx"
import { type FilePath, joinSegments, slugifyFilePath } from "../quartz/util/path"

const frontmatterAssetKeys = ["assets", "asset", "socialImage", "image", "cover"]
const mediaAttributes = ["src", "data", "href", "poster"]

// These extensions are used only to decide whether a free-form string looks
// like an asset reference. Exact references (frontmatter, HTML attributes,
// and direct wikilinks) are still resolved against the actual file index.
const assetExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".avif",
  ".jxl",
  ".svg",
  ".ico",
  ".pdf",
  ".mp4",
  ".webm",
  ".ogv",
  ".avi",
  ".mov",
  ".flv",
  ".wmv",
  ".mkv",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".m4v",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".oga",
  ".aac",
  ".flac",
  ".css",
  ".js",
  ".json",
  ".xml",
  ".zip",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
])

type AssetIndex = {
  exact: Map<string, FilePath>
  byBasename: Map<string, FilePath[]>
  all: FilePath[]
}

type AssetReference = {
  target: string
  source: string
}

function getPageTypeExtensions(ctx: BuildCtx): Set<string> {
  const extensions = new Set<string>()
  const pageTypes = ctx.cfg.plugins.pageTypes ?? []
  for (const pageType of pageTypes) {
    for (const extension of pageType.fileExtensions ?? []) {
      extensions.add(extension.toLowerCase())
    }
  }
  return extensions
}

function normalizeCandidate(value: string): string {
  return path.posix.normalize(value.replaceAll("\\", "/").replace(/^content\//i, ""))
}

function decodeTarget(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeTarget(value: string): string | undefined {
  let target = value.trim()
  if (!target) return undefined

  if (target.startsWith("<") && target.includes(">")) {
    target = target.slice(1, target.indexOf(">"))
  }
  if (target.startsWith("[[") && target.endsWith("]]")) {
    target = target.slice(2, -2)
  }

  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return undefined

  target = target.split("|")[0]?.trim() ?? ""
  target = target.split("#")[0]?.trim() ?? ""
  target = target.split("?")[0]?.trim() ?? ""
  if (!target) return undefined

  target = decodeTarget(target).replaceAll("\\", "/")
  target = target.replace(/^\/+/, "").replace(/^content\//i, "")
  target = path.posix.normalize(target)
  if (target === "." || target === "..") return undefined
  return target
}

function looksLikeAsset(value: string): boolean {
  const target = normalizeTarget(value)
  if (!target) return false
  return assetExtensions.has(path.posix.extname(target).toLowerCase())
}

function isAssetFile(filePath: string, pageTypeExtensions: Set<string>): boolean {
  const normalized = filePath.toLowerCase()
  if (normalized.endsWith(".md")) return false
  return !pageTypeExtensions.has(path.posix.extname(normalized))
}

function buildAssetIndex(filePaths: FilePath[], pageTypeExtensions: Set<string>): AssetIndex {
  const assets = filePaths
    .map((filePath) => normalizeCandidate(filePath))
    .filter((filePath) => isAssetFile(filePath, pageTypeExtensions))
    .map((filePath) => filePath as FilePath)
    .sort()

  const exact = new Map<string, FilePath>()
  const byBasename = new Map<string, FilePath[]>()
  for (const filePath of assets) {
    exact.set(filePath, filePath)
    const basename = path.posix.basename(filePath).toLowerCase()
    const matches = byBasename.get(basename) ?? []
    matches.push(filePath)
    byBasename.set(basename, matches)
  }

  return { exact, byBasename, all: assets }
}

function resolveAssetTarget(
  target: string,
  sourcePath: string,
  index: AssetIndex,
): FilePath | undefined {
  const normalizedTarget = normalizeTarget(target)
  if (!normalizedTarget) return undefined

  const source = normalizeCandidate(sourcePath)
  const sourceDirectory = path.posix.dirname(source)
  const candidates = [
    normalizeCandidate(path.posix.join(sourceDirectory, normalizedTarget)),
    normalizeCandidate(normalizedTarget),
  ]

  for (const candidate of candidates) {
    const direct = index.exact.get(candidate)
    if (direct) return direct
  }

  const suffixMatches = index.all.filter((filePath) => filePath.endsWith(`/${normalizedTarget}`))
  if (suffixMatches.length === 1) return suffixMatches[0]

  const basenameMatches = index.byBasename.get(path.posix.basename(normalizedTarget).toLowerCase())
  return basenameMatches?.length === 1 ? basenameMatches[0] : undefined
}

function addRawTarget(targets: AssetReference[], target: string, source: string): void {
  if (target.trim()) targets.push({ target, source })
}

function collectRawReferences(raw: string, source: string): AssetReference[] {
  const references: AssetReference[] = []

  for (const match of raw.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) {
    const target = match[1] ?? ""
    if (match[0]?.startsWith("!") || looksLikeAsset(target)) {
      addRawTarget(references, target, source)
    }
  }

  for (const match of raw.matchAll(/!?\[[^\]\n]*\]\((<[^>\n]+>|[^)\n]+)\)/g)) {
    const target = match[1] ?? ""
    if (match[0]?.startsWith("!") || looksLikeAsset(target)) {
      addRawTarget(references, target, source)
    }
  }

  const htmlAttribute =
    /<(?:img|video|audio|iframe|source|object|embed|track|script|link|a)\b[^>]*?\b(?:src|data|href|poster)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi
  for (const match of raw.matchAll(htmlAttribute)) {
    addRawTarget(references, match[1] ?? match[2] ?? match[3] ?? "", source)
  }

  return references
}

function collectSourceReferences(raw: string, source: string): AssetReference[] {
  // Source-relative references are more reliable than the rewritten URLs in
  // HAST (CrawlLinks turns `./_assets/foo.png` into a page-relative URL). Do
  // not inspect fenced examples, otherwise documentation that merely shows an
  // embed would make that example's asset public.
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
  body = body
    .replace(
      /(^|\r?\n)[ \t]{0,3}```[^\r\n]*\r?\n[\s\S]*?(?:^|\r?\n)[ \t]{0,3}```[ \t]*(?:\r?\n|$)/gm,
      "$1",
    )
    .replace(
      /(^|\r?\n)[ \t]{0,3}~~~[^\r\n]*\r?\n[\s\S]*?(?:^|\r?\n)[ \t]{0,3}~~~[ \t]*(?:\r?\n|$)/gm,
      "$1",
    )
  return collectRawReferences(body, source)
}

function collectHastReferences(value: unknown, source: string, references: AssetReference[]): void {
  if (Array.isArray(value)) {
    for (const child of value) collectHastReferences(child, source, references)
    return
  }
  if (!value || typeof value !== "object") return

  const node = value as Record<string, unknown>
  const properties = node.properties
  if (properties && typeof properties === "object") {
    for (const attribute of mediaAttributes) {
      const target = (properties as Record<string, unknown>)[attribute]
      if (typeof target === "string") addRawTarget(references, target, source)
    }
  }
  if (node.type === "raw" && typeof node.value === "string") {
    references.push(...collectRawReferences(node.value, source))
  }
  collectHastReferences(node.children, source, references)
}

function collectFrontmatterReferences(
  frontmatter: unknown,
  source: string,
  references: AssetReference[],
): void {
  if (!frontmatter || typeof frontmatter !== "object") return
  const record = frontmatter as Record<string, unknown>
  for (const key of frontmatterAssetKeys) {
    const value = record[key]
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (typeof item === "string") addRawTarget(references, item, source)
    }
  }
}

function collectNestedAssetStrings(
  value: unknown,
  source: string,
  references: AssetReference[],
): void {
  if (typeof value === "string") {
    if (looksLikeAsset(value)) addRawTarget(references, value, source)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNestedAssetStrings(item, source, references)
    return
  }
  if (!value || typeof value !== "object") return
  for (const item of Object.values(value as Record<string, unknown>)) {
    collectNestedAssetStrings(item, source, references)
  }
}

function sourcePathFor(data: Record<string, unknown>): string {
  const relativePath =
    typeof data.relativePath === "string"
      ? data.relativePath
      : typeof data.filePath === "string"
        ? data.filePath
        : ""

  // Page-type plugins create virtual vfiles with a synthetic `.md` suffix.
  // Their embedded paths are relative to the original `.canvas`, `.base`, or
  // `.excalidraw` file, so remove only that synthetic suffix.
  if (data.canvasData || data.basesData || data.excalidrawData) {
    return relativePath.replace(/\.md$/i, "")
  }
  return relativePath
}

function collectVirtualReferences(
  data: Record<string, unknown>,
  source: string,
  references: AssetReference[],
): void {
  const imagePaths = data.excalidrawImagePaths
  if (imagePaths && typeof imagePaths === "object") {
    for (const target of Object.values(imagePaths as Record<string, unknown>)) {
      if (typeof target === "string") addRawTarget(references, target, source)
    }
  }

  const canvasData = data.canvasData as Record<string, unknown> | undefined
  if (canvasData && Array.isArray(canvasData.nodes)) {
    for (const node of canvasData.nodes) {
      if (!node || typeof node !== "object") continue
      const target = (node as Record<string, unknown>).file
      if (typeof target === "string") addRawTarget(references, target, source)
    }
  }
  const renderedTexts = canvasData?.renderedTexts
  if (renderedTexts && typeof renderedTexts === "object") {
    for (const rendered of Object.values(renderedTexts as Record<string, unknown>)) {
      if (typeof rendered === "string") references.push(...collectRawReferences(rendered, source))
    }
  }

  const excalidrawData = data.excalidrawData as Record<string, unknown> | undefined
  if (excalidrawData && typeof excalidrawData.embeddedFiles === "object") {
    for (const target of Object.values(excalidrawData.embeddedFiles as Record<string, unknown>)) {
      if (typeof target === "string") addRawTarget(references, target, source)
    }
  }

  // Bases can render an image field selected from a published note. Restrict
  // this recursive scan to strings with asset-like extensions; note titles and
  // formulas therefore do not turn into public files by themselves.
  collectNestedAssetStrings(data.basesData, source, references)
}

async function publishedAssetPaths(
  ctx: BuildCtx,
  content: ProcessedContent[],
): Promise<Set<FilePath>> {
  const pageTypeExtensions = getPageTypeExtensions(ctx)
  const ignored = ctx.cfg.configuration?.ignorePatterns ?? []
  const allFiles = await glob("**", ctx.argv.directory, ignored)
  const index = buildAssetIndex(allFiles, pageTypeExtensions)
  const references: AssetReference[] = []

  for (const [tree, file] of content) {
    const data = file.data as Record<string, unknown>
    const source = sourcePathFor(data)
    if (!source) continue

    if (typeof file.value === "string" && file.value.length > 0) {
      references.push(...collectSourceReferences(file.value, source))
    }
    collectFrontmatterReferences(data.frontmatter, source, references)
    collectHastReferences(tree, source, references)
    collectVirtualReferences(data, source, references)
  }

  const resolved = new Set<FilePath>()
  for (const reference of references) {
    const asset = resolveAssetTarget(reference.target, reference.source, index)
    if (asset) resolved.add(asset)
  }
  return resolved
}

async function copyAsset(ctx: BuildCtx, filePath: FilePath): Promise<FilePath> {
  const source = joinSegments(ctx.argv.directory, filePath) as FilePath
  const destination = joinSegments(ctx.argv.output, slugifyFilePath(filePath)) as FilePath
  await fs.promises.mkdir(path.dirname(destination), { recursive: true })
  await fs.promises.copyFile(source, destination)
  return destination
}

async function removeAsset(ctx: BuildCtx, filePath: FilePath): Promise<void> {
  const destination = joinSegments(ctx.argv.output, slugifyFilePath(filePath)) as FilePath
  await fs.promises.rm(destination, { force: true })
}

/**
 * Quartz's built-in Assets emitter copies every non-Markdown file. This
 * replacement keeps the same output naming but limits the set to assets
 * referenced by pages that already passed the publication filters.
 */
export const PublicationAwareAssets: QuartzEmitterPlugin = () => {
  let previousPublishedAssets: Set<FilePath> | undefined

  return {
    name: "Assets",
    async *emit(ctx, content) {
      const current = await publishedAssetPaths(ctx, content)
      for (const filePath of [...current].sort()) {
        yield copyAsset(ctx, filePath)
      }
      previousPublishedAssets = current
    },
    async *partialEmit(ctx, content, _resources, changeEvents: ChangeEvent[]) {
      const current = await publishedAssetPaths(ctx, content)
      const previous = previousPublishedAssets ?? new Set<FilePath>()

      for (const filePath of previous) {
        if (!current.has(filePath)) await removeAsset(ctx, filePath)
      }

      const changed = new Set(changeEvents.map((event) => normalizeCandidate(event.path)))
      for (const filePath of [...current].sort()) {
        if (!previous.has(filePath) || changed.has(filePath)) {
          yield copyAsset(ctx, filePath)
        }
      }

      previousPublishedAssets = current
    },
  }
}
