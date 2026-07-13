import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { Assets } from "./assets"
import type { BuildCtx } from "../../util/ctx"
import type { FilePath } from "../../util/path"
import type { StaticResources } from "../../util/resources"

const resources: StaticResources = {
  css: [],
  js: [],
  additionalHead: [],
}

test("partial emit tolerates repeated delete events", async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "quartz-assets-test-"))
  const assetPath = "images/missing.png" as FilePath
  const destination = path.join(output, assetPath)

  try {
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, "asset")

    const emitter = Assets()
    const ctx = {
      argv: { output },
      cfg: { plugins: { pageTypes: [] } },
    } as unknown as BuildCtx
    const emitted = emitter.partialEmit?.(ctx, [], resources, [
      { type: "delete", path: assetPath },
      { type: "delete", path: assetPath },
    ])

    assert.ok(emitted)
    if (Symbol.asyncIterator in emitted) {
      for await (const _file of emitted) {
        // Consume the generator so both delete events run.
      }
    } else {
      await emitted
    }

    await assert.rejects(fs.access(destination), { code: "ENOENT" })
  } finally {
    await fs.rm(output, { recursive: true, force: true })
  }
})
