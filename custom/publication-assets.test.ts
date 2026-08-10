import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { defaultProcessedContent, type ProcessedContent } from "../quartz/plugins/vfile"
import type { BuildCtx } from "../quartz/util/ctx"
import { slugifyFilePath } from "../quartz/util/path"
import { PublicationAwareAssets } from "./publication-assets"

async function drain(emitted: AsyncGenerator<string>): Promise<void> {
  for await (const _file of emitted) {
    // Consume the generator so filesystem writes and cleanup run.
  }
}

function markdown(
  relativePath: string,
  raw: string,
  frontmatter: Record<string, unknown>,
): ProcessedContent {
  const [tree, file] = defaultProcessedContent({
    relativePath,
    slug: slugifyFilePath(relativePath.replace(/\.md$/i, "")),
    frontmatter,
  })
  file.value = raw
  return [tree, file]
}

function buildContext(contentDirectory: string, outputDirectory: string): BuildCtx {
  return {
    argv: {
      directory: contentDirectory,
      output: outputDirectory,
    },
    cfg: {
      configuration: { ignorePatterns: [] },
      plugins: { pageTypes: [] },
    },
    allFiles: [],
    allSlugs: [],
    virtualPages: [],
  } as unknown as BuildCtx
}

test("copies only assets referenced by published pages and removes them on unpublish", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "publication-assets-"))
  const contentDirectory = path.join(root, "content")
  const outputDirectory = path.join(root, "public")
  await fs.mkdir(path.join(contentDirectory, "notes", "nested"), { recursive: true })
  await fs.mkdir(path.join(contentDirectory, "boards"), { recursive: true })
  await fs.writeFile(path.join(contentDirectory, "notes", "published.md"), "")
  await fs.writeFile(path.join(contentDirectory, "notes", "published.png"), "published")
  await fs.writeFile(path.join(contentDirectory, "notes", "private.png"), "private")
  await fs.writeFile(path.join(contentDirectory, "notes", "orphan.png"), "orphan")
  await fs.writeFile(path.join(contentDirectory, "notes", "code-example.png"), "code")
  await fs.writeFile(path.join(contentDirectory, "notes", "nested", "manual.pdf"), "pdf")
  await fs.writeFile(path.join(contentDirectory, "boards", "board.png"), "board")

  const published = markdown(
    "notes/published.md",
    [
      "---",
      "publish: true",
      "---",
      "",
      "![[published.png]]",
      "[manual](./nested/manual.pdf)",
      "",
      "```md",
      "![[code-example.png]]",
      "```",
    ].join("\n"),
    { publish: true },
  )
  published[0].children = [
    {
      type: "element",
      tagName: "img",
      properties: { src: "published.png" },
      children: [],
    },
    {
      type: "element",
      tagName: "a",
      properties: { href: "./nested/manual.pdf" },
      children: [],
    },
  ]
  const [canvasTree, canvasFile] = defaultProcessedContent({
    relativePath: "boards/demo.canvas.md",
    canvasData: { nodes: [{ type: "file", file: "board.png" }] },
  })
  const publishedCanvas: ProcessedContent = [canvasTree, canvasFile]
  const ctx = buildContext(contentDirectory, outputDirectory)
  const emitter = PublicationAwareAssets()

  try {
    await drain(
      emitter.emit(ctx, [published, publishedCanvas], {} as never) as AsyncGenerator<string>,
    )

    const publishedOutput = path.join(outputDirectory, slugifyFilePath("notes/published.png"))
    const pdfOutput = path.join(outputDirectory, slugifyFilePath("notes/nested/manual.pdf"))
    const privateOutput = path.join(outputDirectory, slugifyFilePath("notes/private.png"))
    const orphanOutput = path.join(outputDirectory, slugifyFilePath("notes/orphan.png"))
    const codeOutput = path.join(outputDirectory, slugifyFilePath("notes/code-example.png"))
    const canvasOutput = path.join(outputDirectory, slugifyFilePath("boards/board.png"))

    await assert.doesNotReject(fs.access(publishedOutput))
    await assert.doesNotReject(fs.access(pdfOutput))
    await assert.rejects(fs.access(privateOutput), { code: "ENOENT" })
    await assert.rejects(fs.access(orphanOutput), { code: "ENOENT" })
    await assert.rejects(fs.access(codeOutput), { code: "ENOENT" })
    await assert.doesNotReject(fs.access(canvasOutput))

    await drain(
      emitter.partialEmit!(ctx, [], {} as never, [
        { type: "change", path: "notes/published.md" },
      ]) as AsyncGenerator<string>,
    )
    await assert.rejects(fs.access(publishedOutput), { code: "ENOENT" })
    await assert.rejects(fs.access(pdfOutput), { code: "ENOENT" })
    await assert.rejects(fs.access(canvasOutput), { code: "ENOENT" })
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
