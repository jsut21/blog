import path from "node:path"

import type { Root as MarkdownRoot } from "mdast"
import LZString from "lz-string"
import type { VFile } from "vfile"

import type { QuartzTransformerPlugin } from "../quartz/plugins/types"
import type { FilePath } from "../quartz/util/path"

type ExcalidrawFile = {
  dataURL?: unknown
}

export type ExcalidrawData = {
  type: "excalidraw"
  version: number
  source?: string
  elements: Array<Record<string, unknown>>
  appState: Record<string, unknown>
  files: Record<string, ExcalidrawFile>
  embeddedFiles?: Record<string, string>
}

export type ExcalidrawTheme = "auto" | "light" | "dark"

const defaultAppState = {
  viewBackgroundColor: "#ffffff",
  exportBackground: true,
  exportWithDarkMode: false,
}

function frontmatterBlock(raw: string): string {
  return raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? ""
}

export function isFrontmatterExcalidraw(
  raw: string,
  frontmatter?: Record<string, unknown>,
): boolean {
  if (frontmatter && Object.hasOwn(frontmatter, "excalidraw-plugin")) {
    const marker = frontmatter["excalidraw-plugin"]
    return marker !== false && marker !== null && marker !== undefined
  }

  const marker = frontmatterBlock(raw).match(/^\s*excalidraw-plugin\s*:\s*(.*?)\s*$/im)?.[1]
  if (marker === undefined) return false

  return !["", "false", "null", "~"].includes(marker.trim().toLowerCase())
}

function extractDrawingJson(raw: string): string | null {
  const drawingMarker = raw.search(/^##?\s+Drawing\s*$/im)
  const drawingSection = drawingMarker === -1 ? raw : raw.slice(drawingMarker)
  const compressed = drawingSection.match(/```compressed-json[^\r\n]*\r?\n([\s\S]*?)```/i)

  if (compressed) {
    return LZString.decompressFromBase64(compressed[1].replace(/\s/g, ""))
  }

  const fencedJson = drawingSection.match(/```json[^\r\n]*\r?\n([\s\S]*?)```/i)
  if (fencedJson) return fencedJson[1].trim()

  const percentBlock = drawingSection.match(/%%([\s\S]*?)%%/)
  const candidate = percentBlock?.[1] ?? drawingSection
  const firstBrace = candidate.indexOf("{")
  const lastBrace = candidate.lastIndexOf("}")

  return firstBrace === -1 || lastBrace <= firstBrace
    ? null
    : candidate.slice(firstBrace, lastBrace + 1)
}

function parseEmbeddedFiles(raw: string): Record<string, string> {
  const embeddedFiles: Record<string, string> = {}
  const heading = raw.match(/^##?\s+Embedded\s+[Ff]iles\s*$/im)
  if (!heading || heading.index === undefined) return embeddedFiles

  const afterHeading = raw.slice(heading.index + heading[0].length)
  const sectionEnd = afterHeading.search(/^%%|^##?\s/m)
  const section = sectionEnd === -1 ? afterHeading : afterHeading.slice(0, sectionEnd)
  const entry = /^([a-f0-9]+):\s+\[\[(.+?)\]\]\s*$/gm

  for (const match of section.matchAll(entry)) {
    embeddedFiles[match[1]] = match[2]
  }

  return embeddedFiles
}

export function parseExcalidrawMarkdown(raw: string): ExcalidrawData | null {
  const json = extractDrawingJson(raw)
  if (!json) return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }

  if (parsed.type !== "excalidraw") return null

  const elements = Array.isArray(parsed.elements)
    ? (parsed.elements as Array<Record<string, unknown>>).filter((element) => !element.isDeleted)
    : []
  const appState =
    typeof parsed.appState === "object" && parsed.appState !== null
      ? (parsed.appState as Record<string, unknown>)
      : {}
  const files =
    typeof parsed.files === "object" && parsed.files !== null
      ? (parsed.files as Record<string, ExcalidrawFile>)
      : {}
  const embeddedFiles = parseEmbeddedFiles(raw)

  return {
    type: "excalidraw",
    version: typeof parsed.version === "number" ? parsed.version : 2,
    source: typeof parsed.source === "string" ? parsed.source : undefined,
    elements,
    appState: { ...defaultAppState, ...appState },
    files,
    ...(Object.keys(embeddedFiles).length > 0 ? { embeddedFiles } : {}),
  }
}

export function resolveExcalidrawTheme(data: ExcalidrawData): ExcalidrawTheme {
  const theme = data.appState.theme
  return theme === "dark" || theme === "light" ? theme : "auto"
}

function normalizeWikilinkTarget(target: string): string {
  return target
    .split("|")[0]
    .split("#")[0]
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^content\//, "")
}

export function resolveExcalidrawImagePaths(
  data: ExcalidrawData,
  relativePath: string,
  allFiles: FilePath[],
): Record<string, string> {
  const result: Record<string, string> = {}
  const allFileNames = new Set<string>(allFiles)
  const drawingDirectory = path.posix.dirname(relativePath)

  for (const [hash, rawTarget] of Object.entries(data.embeddedFiles ?? {})) {
    if (data.files[hash]?.dataURL) continue

    const target = normalizeWikilinkTarget(rawTarget)
    const directCandidates = [
      path.posix.normalize(path.posix.join(drawingDirectory, target)),
      path.posix.normalize(target),
    ]
    const direct = directCandidates.find((candidate) => allFileNames.has(candidate))
    if (direct) {
      result[hash] = direct
      continue
    }

    const targetName = path.posix.basename(target).toLowerCase()
    const matches = allFiles.filter(
      (filePath) => path.posix.basename(filePath).toLowerCase() === targetName,
    )

    if (matches.length === 1) {
      result[hash] = matches[0]
      continue
    }

    const reason =
      matches.length === 0
        ? "is missing"
        : `is ambiguous (${matches.map((match) => `"${match}"`).join(", ")})`
    throw new Error(`Excalidraw image "${rawTarget}" referenced by ${relativePath} ${reason}`)
  }

  return result
}

export const ExcalidrawMarkdownCompatibility: QuartzTransformerPlugin = () => ({
  name: "ExcalidrawMarkdownCompatibility",
  markdownPlugins(ctx) {
    return [
      () => (tree: MarkdownRoot, file: VFile) => {
        const raw = file.value.toString()
        const frontmatter = file.data.frontmatter as Record<string, unknown> | undefined
        if (!isFrontmatterExcalidraw(raw, frontmatter)) return

        const relativePath = file.data.relativePath
        if (typeof relativePath !== "string") {
          throw new Error("Excalidraw Markdown is missing its relative path")
        }

        const data = parseExcalidrawMarkdown(raw)
        if (!data) {
          throw new Error(`Could not parse Excalidraw drawing data from ${relativePath}`)
        }

        file.data.excalidrawData = data
        file.data.excalidrawOptions = {
          enableInteraction: true,
          darkMode: resolveExcalidrawTheme(data),
          exportPadding: 20,
        }
        file.data.excalidrawImagePaths = resolveExcalidrawImagePaths(
          data,
          relativePath,
          ctx.allFiles,
        )

        // The Excalidraw page type renders from excalidrawData. Keeping the Markdown
        // warning and compressed payload in the AST would leak them into search.
        tree.children = []
      },
    ]
  },
})
