import assert from "node:assert/strict"
import test from "node:test"

import { h } from "preact"

import type { QuartzComponent } from "../quartz/components/types"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import {
  excalidrawInteractionScript,
  excalidrawMaxZoom,
  zoomAroundPoint,
} from "./excalidraw-interactions"
import { patchExcalidrawPage } from "./excalidraw-page"

function fixturePageType(): PageTypePluginEntry {
  const component: QuartzComponent = () => h("article", { class: "excalidraw-page" })
  component.css = ':root[saved-theme="dark"] {\n  --excalidraw-bg: #121212;\n}'
  component.afterDOMLoaded =
    'const MIN_ZOOM = 0.1;\nconst MAX_ZOOM = 5;\ndocument.querySelector(".excalidraw-zoom-in")'

  return {
    name: "ExcalidrawPage",
    layout: "excalidraw",
    match: () => true,
    body: () => component,
  }
}

test("scopes the authored dark palette to a dark Excalidraw drawing", () => {
  const pageType = fixturePageType()
  assert.equal(patchExcalidrawPage([pageType]), 1)

  const component = pageType.body(undefined)
  const rendered = component({
    fileData: { excalidrawOptions: { darkMode: "dark" } },
  } as never)

  assert.equal(rendered.props.class, "excalidraw-page excalidraw-theme-dark")
  assert.match(component.css as string, /:root\[saved-theme="dark"\],\n\.excalidraw-theme-dark/)
})

test("raises the Excalidraw interaction limit from 5x to 20x", () => {
  const pageType = fixturePageType()
  patchExcalidrawPage([pageType])

  const component = pageType.body(undefined)
  assert.equal(component.afterDOMLoaded, excalidrawInteractionScript)
  assert.match(component.afterDOMLoaded as string, new RegExp(`MAX_ZOOM = ${excalidrawMaxZoom}`))
  assert.doesNotMatch(component.afterDOMLoaded as string, /MAX_ZOOM = 5/)
})

test("keeps the drawing coordinate under the pointer fixed while zooming", () => {
  const pointer = { x: 640, y: 360 }
  const before = { zoom: 2, panX: 120, panY: -40 }
  const drawingPoint = {
    x: (pointer.x - before.panX) / before.zoom,
    y: (pointer.y - before.panY) / before.zoom,
  }
  const after = zoomAroundPoint(before, 4, pointer)

  assert.equal(drawingPoint.x * after.zoom + after.panX, pointer.x)
  assert.equal(drawingPoint.y * after.zoom + after.panY, pointer.y)
})

test("does not apply the drawing-level dark palette to light drawings", () => {
  const pageType = fixturePageType()
  patchExcalidrawPage([pageType])

  const component = pageType.body(undefined)
  const rendered = component({
    fileData: { excalidrawOptions: { darkMode: "light" } },
  } as never)

  assert.equal(rendered.props.class, "excalidraw-page")
})
