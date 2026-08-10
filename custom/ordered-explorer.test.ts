import assert from "node:assert/strict"
import test from "node:test"

import { orderedExplorerSort } from "./ordered-explorer"

type Node = Parameters<typeof orderedExplorerSort>[0]

function folder(displayName: string): Node {
  return {
    isFolder: true,
    displayName,
    slugSegments: [displayName.toLowerCase()],
  }
}

test("orders root folders like the Obsidian sortspec", () => {
  const nodes = [
    folder("Resource"),
    folder("Archive"),
    folder("Project"),
    folder("분류 전"),
    folder("Area of Responsibility"),
  ]

  nodes.sort(orderedExplorerSort)

  assert.deepEqual(
    nodes.map((node) => node.displayName),
    ["분류 전", "Project", "Area of Responsibility", "Resource", "Archive"],
  )
})

test("keeps unknown folders alphabetical after the explicit order", () => {
  const nodes = [folder("Zeta"), folder("Alpha"), folder("Resource")]

  nodes.sort(orderedExplorerSort)

  assert.deepEqual(
    nodes.map((node) => node.displayName),
    ["Resource", "Alpha", "Zeta"],
  )
})

test("keeps files after folders", () => {
  const nodes: Node[] = [{ isFolder: false, displayName: "A note" }, folder("Project")]

  nodes.sort(orderedExplorerSort)

  assert.equal(nodes[0]?.displayName, "Project")
  assert.equal(nodes[1]?.displayName, "A note")
})

test("is self-contained when Explorer serializes the comparator for the browser", () => {
  const serialized = orderedExplorerSort.toString()
  const browserComparator = new Function("a", "b", `return (${serialized})(a, b)`) as (
    a: Node,
    b: Node,
  ) => number

  assert.equal(browserComparator(folder("Project"), folder("Resource")) < 0, true)
})
