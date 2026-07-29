import assert from "node:assert/strict"
import test from "node:test"

import { h, toChildArray, type VNode } from "preact"

import type { QuartzComponent } from "../quartz/components/types"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import {
  excalidrawInteractionScript,
  excalidrawMaxZoom,
  excalidrawZoomFactor,
  zoomByFactor,
  zoomAroundPoint,
} from "./excalidraw-interactions"
import { patchExcalidrawPage, patchExcalidrawSvgThemeColors } from "./excalidraw-page"

function fixturePageType(): PageTypePluginEntry {
  const component: QuartzComponent = () =>
    h(
      "article",
      { class: "excalidraw-page" },
      h("div", { class: "excalidraw-controls" }),
      h("div", {
        class: "excalidraw-container",
        dangerouslySetInnerHTML: {
          __html:
            '<svg><path d="M0 0 L10 10" fill="none" stroke="#1e1e1e" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" /></svg>',
        },
      }),
    )
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

test("uses proportional zoom steps across the full zoom range", () => {
  const nearIncrement = zoomByFactor(1, true, excalidrawZoomFactor) - 1
  const farIncrement = zoomByFactor(10, true, excalidrawZoomFactor) - 10

  assert(Math.abs(nearIncrement - farIncrement / 10) < 1e-12)
  assert(
    Math.abs(
      zoomByFactor(zoomByFactor(3, true, excalidrawZoomFactor), false, excalidrawZoomFactor) - 3,
    ) < 1e-12,
  )
  assert.match(excalidrawInteractionScript, /EXCALIDRAW_ZOOM_FACTOR = 1\.15/)
  assert.doesNotMatch(excalidrawInteractionScript, /zoom \+ delta|EXCALIDRAW_ZOOM_STEP/)
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

test("routes literal arrowhead strokes through the Excalidraw theme palette", () => {
  const source =
    '<path d="M0 0 L10 10" fill="none" stroke="#1e1e1e" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />'
  const patched = patchExcalidrawSvgThemeColors(source)

  assert.match(patched, /stroke="var\(--excalidraw-color-1e1e1e, #1e1e1e\)"/)
  assert.doesNotMatch(patched, /stroke="#1e1e1e"/)
})

test("patches rendered arrowheads inside the Excalidraw SVG container", () => {
  const pageType = fixturePageType()
  patchExcalidrawPage([pageType])

  const component = pageType.body(undefined)
  const rendered = component({
    fileData: { excalidrawOptions: { darkMode: "dark" } },
  } as never) as VNode<{ children?: unknown }>
  const container = toChildArray(rendered.props.children).find(
    (child) =>
      typeof child === "object" &&
      child !== null &&
      "props" in child &&
      (child as VNode<{ class?: string }>).props.class === "excalidraw-container",
  ) as VNode<{ dangerouslySetInnerHTML?: { __html?: string } }>

  assert.match(
    container.props.dangerouslySetInnerHTML?.__html ?? "",
    /stroke="var\(--excalidraw-color-1e1e1e, #1e1e1e\)"/,
  )
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
