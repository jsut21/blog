import assert from "node:assert/strict"
import test from "node:test"
import type { Element, Root, Text } from "hast"
import { VFile } from "vfile"

import { applyCornellBlockIds } from "./blog-customizations"

test("applies paragraph block IDs before the upstream Obsidian transformer", () => {
  const text: Text = {
    type: "text",
    value: "연결 대상 본문이다. ^Target-Block",
  }
  const paragraph: Element = {
    type: "element",
    tagName: "p",
    properties: {},
    children: [text],
  }
  const tree: Root = {
    type: "root",
    children: [paragraph],
  }
  const file = new VFile()

  applyCornellBlockIds(tree, file)

  assert.equal(text.value, "연결 대상 본문이다.")
  assert.equal(paragraph.properties.id, "target-block")
  assert.equal(
    (file.data.blocks as Record<string, Element> | undefined)?.["target-block"],
    paragraph,
  )
})

test("leaves ordinary paragraphs unchanged", () => {
  const paragraph: Element = {
    type: "element",
    tagName: "p",
    properties: {},
    children: [{ type: "text", value: "일반 본문이다." }],
  }
  const tree: Root = { type: "root", children: [paragraph] }

  applyCornellBlockIds(tree, new VFile())

  assert.deepEqual(paragraph.properties, {})
  assert.equal((paragraph.children[0] as Text).value, "일반 본문이다.")
})
