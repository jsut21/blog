import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

import type { QuartzConfig } from "../quartz/cfg"
import type { QuartzFilterPlugin } from "../quartz/plugins/types"
import type { ProcessedContent } from "../quartz/plugins/vfile"
import type { BuildCtx } from "../quartz/util/ctx"
import { type FilePath, slugifyFilePath } from "../quartz/util/path"

const controlsDirectory = "_publication"
const controlledFileTypes = [
  { suffix: ".excalidraw.md", contentType: "excalidraw" },
  { suffix: ".excalidraw", contentType: "excalidraw" },
  { suffix: ".canvas", contentType: "canvas" },
  { suffix: ".base", contentType: "base" },
] as const

function controlledContentType(filePath: string): string | undefined {
  const normalized = filePath.toLowerCase()
  return controlledFileTypes.find(({ suffix }) => normalized.endsWith(suffix))?.contentType
}

type PublicationControl = {
  target: FilePath
  publish: boolean
  source: string
}

function isEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === 1
}

function parseFrontmatter(raw: string, source: string): Record<string, unknown> {
  const openingLength = raw.startsWith("---\r\n") ? 5 : raw.startsWith("---\n") ? 4 : 0
  if (openingLength === 0) return {}

  const rest = raw.slice(openingLength)
  const closing = rest.match(/(^|\r?\n)---[ \t]*(\r?\n|$)/)
  if (!closing || closing.index === undefined) return {}

  const parsed = YAML.parse(rest.slice(0, closing.index)) ?? {}
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Publication control frontmatter must be a map: ${source}`)
  }

  return parsed as Record<string, unknown>
}

function normalizeTarget(value: unknown, source: string): FilePath {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Publication control is missing a target link: ${source}`)
  }

  let target = value.trim().replaceAll("\\", "/")
  if (target.startsWith("[[") && target.endsWith("]]")) {
    target = target.slice(2, -2).split("|")[0]
  }
  target = target.replace(/^\/+/, "").replace(/^content\//, "")
  target = path.posix.normalize(target)

  if (target === ".." || target.startsWith("../")) {
    throw new Error(`Publication control target must stay inside content/: ${source}`)
  }
  if (!controlledContentType(target)) {
    throw new Error(
      `Publication control target must be a .canvas, .base, .excalidraw, or .excalidraw.md file: ${source}`,
    )
  }

  return target as FilePath
}

function walkMarkdown(directory: string): string[] {
  if (!fs.existsSync(directory)) return []

  const files: string[] = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkMarkdown(absolutePath))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absolutePath)
    }
  }
  return files
}

function loadPublicationControls(contentDirectory: string): Map<FilePath, PublicationControl> {
  const directory = path.join(contentDirectory, controlsDirectory)
  const controls = new Map<FilePath, PublicationControl>()

  for (const absolutePath of walkMarkdown(directory)) {
    const source = path.relative(contentDirectory, absolutePath).split(path.sep).join("/")
    const data = parseFrontmatter(fs.readFileSync(absolutePath, "utf8"), source)
    if (!isEnabled(data.publication_control)) continue

    const target = normalizeTarget(data.target ?? data.asset, source)
    if (controls.has(target)) {
      throw new Error(
        `Duplicate publication controls for ${target}: ${controls.get(target)?.source}, ${source}`,
      )
    }

    controls.set(target, {
      target,
      publish: isEnabled(data.publish) && !isEnabled(data.draft),
      source,
    })
  }

  return controls
}

function isControlRecord(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/").replace(/^content\//, "")
  return normalized === controlsDirectory || normalized.startsWith(`${controlsDirectory}/`)
}

function publishedContext(ctx: BuildCtx): Pick<BuildCtx, "allFiles" | "allSlugs"> {
  const controls = loadPublicationControls(ctx.argv.directory)
  const publishedTargets = new Set(
    [...controls.values()].filter((control) => control.publish).map((control) => control.target),
  )

  const allFiles = ctx.allFiles.filter((filePath) => {
    if (isControlRecord(filePath)) return false

    return !controlledContentType(filePath) || publishedTargets.has(filePath)
  })

  return {
    allFiles,
    allSlugs: allFiles.map((filePath) => slugifyFilePath(filePath)),
  }
}

function publishedPageSlugs(
  content: ProcessedContent[],
  allFiles: BuildCtx["allFiles"],
): Set<string> {
  const slugs = new Set<string>()

  for (const [, file] of content) {
    if (file.data.slug) slugs.add(file.data.slug)
  }

  for (const filePath of allFiles) {
    if (controlledContentType(filePath)) {
      slugs.add(slugifyFilePath(filePath))
    }
  }

  return slugs
}

async function removePageOutputs(ctx: BuildCtx, slugs: Iterable<string>): Promise<void> {
  await Promise.all(
    [...slugs].map((slug) =>
      fs.promises.rm(path.join(ctx.argv.output, `${slug}.html`), { force: true }),
    ),
  )
}

async function* runWithPublishedContext(
  ctx: BuildCtx,
  run: () => FilePath[] | AsyncGenerator<FilePath> | Promise<FilePath[] | AsyncGenerator<FilePath>>,
  filtered = publishedContext(ctx),
): AsyncGenerator<FilePath> {
  const originalFiles = ctx.allFiles
  const originalSlugs = ctx.allSlugs

  ctx.allFiles = filtered.allFiles
  ctx.allSlugs = filtered.allSlugs

  try {
    const emitted = await run()
    if (Symbol.asyncIterator in emitted) {
      for await (const file of emitted) yield file
    } else {
      for (const file of emitted) yield file
    }
  } finally {
    ctx.allFiles = originalFiles
    ctx.allSlugs = originalSlugs
  }
}

const PublicationControlRecords: QuartzFilterPlugin = () => ({
  name: "PublicationControlRecords",
  shouldPublish(_ctx, [_tree, file]) {
    return !isControlRecord(file.data.relativePath ?? "")
  },
})

export function applyPublicationControls(config: QuartzConfig): void {
  config.plugins.filters.unshift(PublicationControlRecords())

  const basesTransformer = config.plugins.transformers.find(
    (plugin) => plugin.name === "BasesTransformer",
  )
  if (basesTransformer?.htmlPlugins) {
    const htmlPlugins = basesTransformer.htmlPlugins.bind(basesTransformer)
    basesTransformer.htmlPlugins = (ctx) => {
      const filtered = publishedContext(ctx)
      return htmlPlugins({ ...ctx, ...filtered })
    }
  }

  const dispatcher = config.plugins.emitters.find((plugin) => plugin.name === "PageTypeDispatcher")
  if (!dispatcher) {
    throw new Error("The page type dispatcher is required for non-Markdown publication controls")
  }

  const emit = dispatcher.emit.bind(dispatcher)
  let previousPublishedPageSlugs: Set<string> | undefined
  dispatcher.emit = async function* (ctx, content, resources) {
    const filtered = publishedContext(ctx)
    const currentPublishedPageSlugs = publishedPageSlugs(content, filtered.allFiles)

    yield* runWithPublishedContext(ctx, () => emit(ctx, content, resources), filtered)
    previousPublishedPageSlugs = currentPublishedPageSlugs
  }

  if (dispatcher.partialEmit) {
    const partialEmit = dispatcher.partialEmit.bind(dispatcher)
    dispatcher.partialEmit = async function* (ctx, content, resources, changeEvents) {
      const filtered = publishedContext(ctx)
      const currentPublishedPageSlugs = publishedPageSlugs(content, filtered.allFiles)
      const removedSlugs = previousPublishedPageSlugs
        ? new Set(
            [...previousPublishedPageSlugs].filter((slug) => !currentPublishedPageSlugs.has(slug)),
          )
        : new Set<string>()

      yield* runWithPublishedContext(
        ctx,
        async () => {
          const emitted = await partialEmit(ctx, content, resources, changeEvents)
          return emitted ?? []
        },
        filtered,
      )
      await removePageOutputs(ctx, removedSlugs)
      previousPublishedPageSlugs = currentPublishedPageSlugs
    }
  }
}
