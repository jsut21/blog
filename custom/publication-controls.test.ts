import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import type { QuartzConfig } from "../quartz/cfg"
import type { QuartzEmitterPluginInstance } from "../quartz/plugins/types"
import { defaultProcessedContent, type ProcessedContent } from "../quartz/plugins/vfile"
import type { BuildCtx } from "../quartz/util/ctx"
import type { StaticResources } from "../quartz/util/resources"
import { type FilePath, slugifyFilePath } from "../quartz/util/path"
import { applyPublicationControls } from "./publication-controls"

const controlledSuffixes = [".excalidraw.md", ".excalidraw", ".canvas", ".base"]

function isControlledFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase()
  return controlledSuffixes.some((suffix) => normalized.endsWith(suffix))
}

async function writeRenderedPages(ctx: BuildCtx, content: ProcessedContent[]): Promise<FilePath[]> {
  const slugs = new Set(content.flatMap(([, file]) => (file.data.slug ? [file.data.slug] : [])))

  for (const filePath of ctx.allFiles) {
    if (isControlledFile(filePath)) {
      slugs.add(slugifyFilePath(filePath))
    }
  }

  const outputs: FilePath[] = []
  for (const slug of slugs) {
    const output = path.join(ctx.argv.output, `${slug}.html`) as FilePath
    await fs.promises.mkdir(path.dirname(output), { recursive: true })
    await fs.promises.writeFile(output, slug)
    outputs.push(output)
  }
  return outputs
}

function createDispatcher(): QuartzEmitterPluginInstance {
  return {
    name: "PageTypeDispatcher",
    async *emit(ctx, content) {
      yield* await writeRenderedPages(ctx, content)
    },
    async *partialEmit(ctx, content) {
      yield* await writeRenderedPages(ctx, content)
    },
  }
}

async function drain(emitted: AsyncGenerator<FilePath>): Promise<void> {
  for await (const _file of emitted) {
    // Consume the generator so wrapper cleanup and state updates run.
  }
}

function markdown(slug: string): ProcessedContent {
  return defaultProcessedContent({
    slug,
    relativePath: `${slug}.md`,
    frontmatter: { publish: true },
  })
}

test("serve updates add and remove published Markdown and controlled page formats", async (t) => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "publication-controls-"))
  const contentDirectory = path.join(root, "content")
  const controlsDirectory = path.join(contentDirectory, "_publication")
  const outputDirectory = path.join(root, "public")
  const controlledTargets = [
    "diagram.canvas",
    "catalog.base",
    "sketch.excalidraw",
    "drawing.excalidraw.md",
  ]

  await fs.promises.mkdir(controlsDirectory, { recursive: true })
  for (const target of controlledTargets) {
    await fs.promises.writeFile(path.join(contentDirectory, target), "{}")
  }
  await fs.promises.writeFile(path.join(contentDirectory, "note.md"), "# Note")

  const controlPaths = controlledTargets.map((target) => `_publication/${target}.md`)
  const writeControls = (publish: boolean) =>
    Promise.all(
      controlledTargets.map((target, index) =>
        fs.promises.writeFile(
          path.join(contentDirectory, controlPaths[index]),
          [
            "---",
            "publication_control: true",
            `target: "[[content/${target}]]"`,
            `publish: ${publish}`,
            "commit: false",
            "---",
            "",
          ].join("\n"),
        ),
      ),
    )

  await writeControls(false)
  t.after(() => fs.promises.rm(root, { recursive: true, force: true }))

  const dispatcher = createDispatcher()
  const config = {
    plugins: {
      transformers: [],
      filters: [],
      emitters: [dispatcher],
    },
  } as unknown as QuartzConfig
  applyPublicationControls(config)

  const ctx = {
    argv: {
      directory: contentDirectory,
      output: outputDirectory,
    },
    allFiles: ["note.md", ...controlledTargets, ...controlPaths],
    allSlugs: ["note", ...controlledTargets.map((target) => slugifyFilePath(target))],
  } as unknown as BuildCtx
  const resources = {} as StaticResources
  const noteOutput = path.join(outputDirectory, "note.html")
  const controlledOutputs = controlledTargets.map((target) =>
    path.join(outputDirectory, `${slugifyFilePath(target)}.html`),
  )

  await drain(dispatcher.emit(ctx, [], resources) as AsyncGenerator<FilePath>)
  assert.equal(fs.existsSync(noteOutput), false)
  for (const output of controlledOutputs) assert.equal(fs.existsSync(output), false)

  await writeControls(true)
  await drain(
    dispatcher.partialEmit!(ctx, [markdown("note")], resources, []) as AsyncGenerator<FilePath>,
  )
  assert.equal(fs.existsSync(noteOutput), true)
  for (const output of controlledOutputs) assert.equal(fs.existsSync(output), true)

  await writeControls(false)
  await drain(dispatcher.partialEmit!(ctx, [], resources, []) as AsyncGenerator<FilePath>)
  assert.equal(fs.existsSync(noteOutput), false)
  for (const output of controlledOutputs) assert.equal(fs.existsSync(output), false)
})
