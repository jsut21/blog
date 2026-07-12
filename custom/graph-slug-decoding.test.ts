import assert from "node:assert/strict"
import test from "node:test"

import type { FullPageLayout } from "../quartz/cfg"
import type { QuartzComponent } from "../quartz/components/types"
import { patchGraphSlugDecoding } from "./graph-slug-decoding"

function component(script: QuartzComponent["afterDOMLoaded"]): QuartzComponent {
  const value = (() => null) as unknown as QuartzComponent
  value.afterDOMLoaded = script
  return value
}

test("decodes non-ASCII graph slugs once across shared layouts", () => {
  const graph = component('const key = "graph-visited"; const slug = window.location.pathname;')
  const graphScripts = component([
    "const helper = true;",
    'const key = "graph-visited"; const slug = window.location.pathname;',
  ])
  const unrelated = component("const pathname = window.location.pathname;")
  const layouts: Array<Partial<FullPageLayout>> = [
    { right: [graph, graphScripts, unrelated] },
    { right: [graph] },
  ]

  assert.equal(patchGraphSlugDecoding(layouts), 2)
  assert.match(graph.afterDOMLoaded!, /decodeURI\(window\.location\.pathname\)/)
  assert(Array.isArray(graphScripts.afterDOMLoaded))
  assert.match(graphScripts.afterDOMLoaded[1], /decodeURI\(window\.location\.pathname\)/)
  assert.doesNotMatch(graph.afterDOMLoaded!, /decodeURI\(decodeURI\(window\.location\.pathname\)\)/)
  assert.equal(unrelated.afterDOMLoaded, "const pathname = window.location.pathname;")

  assert.equal(patchGraphSlugDecoding(layouts), 2)
  assert.doesNotMatch(graph.afterDOMLoaded!, /decodeURI\(decodeURI\(window\.location\.pathname\)\)/)

  const encoded = new URL("https://example.com/blog/블로그-운영-구조").pathname
  assert.equal(decodeURI(encoded), "/blog/블로그-운영-구조")
})

test("fails visibly when the upstream graph URL reader changes", () => {
  const graph = component('const key = "graph-visited"; const slug = currentPath;')

  assert.throws(() => patchGraphSlugDecoding([{ right: [graph] }]), /graph URL reader changed/)
})
