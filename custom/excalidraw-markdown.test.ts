import assert from "node:assert/strict"
import test from "node:test"

import LZString from "lz-string"

import {
  isFrontmatterExcalidraw,
  parseExcalidrawMarkdown,
  resolveExcalidrawTheme,
  resolveExcalidrawImagePaths,
} from "./excalidraw-markdown"

const drawing = {
  type: "excalidraw",
  version: 2,
  source: "test",
  elements: [
    { id: "visible", type: "rectangle", isDeleted: false },
    { id: "deleted", type: "rectangle", isDeleted: true },
  ],
  appState: { viewBackgroundColor: "#f8f9fa" },
  files: {},
}

function drawingMarkdown(): string {
  const compressed = LZString.compressToBase64(JSON.stringify(drawing))
  return `---
excalidraw-plugin: parsed
---
# Excalidraw Data

## Embedded Files
abc123: [[image.png]]

%%
## Drawing
\`\`\`compressed-json
${compressed}
\`\`\`
%%
`
}

test("detects Obsidian Excalidraw frontmatter on a regular Markdown file", () => {
  assert.equal(isFrontmatterExcalidraw(drawingMarkdown()), true)
  assert.equal(isFrontmatterExcalidraw("---\npublish: true\n---\n"), false)
})

test("parses compressed Excalidraw Markdown and removes deleted elements", () => {
  const parsed = parseExcalidrawMarkdown(drawingMarkdown())

  assert.ok(parsed)
  assert.equal(parsed.elements.length, 1)
  assert.equal(parsed.elements[0].id, "visible")
  assert.equal(parsed.appState.viewBackgroundColor, "#f8f9fa")
  assert.deepEqual(parsed.embeddedFiles, { abc123: "image.png" })
})

test("resolves embedded images relative to the drawing", () => {
  const parsed = parseExcalidrawMarkdown(drawingMarkdown())
  assert.ok(parsed)

  assert.deepEqual(
    resolveExcalidrawImagePaths(parsed, "notes/drawing.md", [
      "notes/drawing.md",
      "notes/image.png",
    ]),
    { abc123: "notes/image.png" },
  )
})

test("preserves the theme authored in Excalidraw", () => {
  const parsed = parseExcalidrawMarkdown(drawingMarkdown())
  assert.ok(parsed)
  assert.equal(resolveExcalidrawTheme(parsed), "auto")

  parsed.appState.theme = "dark"
  assert.equal(resolveExcalidrawTheme(parsed), "dark")

  parsed.appState.theme = "light"
  assert.equal(resolveExcalidrawTheme(parsed), "light")
})
