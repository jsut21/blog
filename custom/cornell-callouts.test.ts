import assert from "node:assert/strict"
import test from "node:test"

import {
  cornellCalloutScript,
  getCornellPanelPlacement,
  getCornellRailBounds,
  parseCornellTargetMetadata,
} from "./cornell-callouts"

test("limits the annotation rail to the first and last marker centers", () => {
  assert.deepEqual(
    getCornellRailBounds({
      rootTop: 200,
      rootBottom: 1000,
      markerCenters: [320, 760, 500],
    }),
    { top: 120, bottom: 240 },
  )
  assert.equal(getCornellRailBounds({ rootTop: 200, rootBottom: 1000, markerCenters: [] }), null)
})

test("parses explicit Cornell callout targets", () => {
  assert.equal(parseCornellTargetMetadata("publish-policy"), "publish-policy")
  assert.equal(parseCornellTargetMetadata("Target=Publish-Policy"), "publish-policy")
  assert.equal(parseCornellTargetMetadata(" target=publish-policy "), "publish-policy")
  assert.equal(parseCornellTargetMetadata("section-2"), "section-2")
})

test("rejects metadata that cannot be an Obsidian block identifier", () => {
  assert.equal(parseCornellTargetMetadata(undefined), null)
  assert.equal(parseCornellTargetMetadata(""), null)
  assert.equal(parseCornellTargetMetadata("target=한글"), null)
  assert.equal(parseCornellTargetMetadata("publish policy"), null)
  assert.equal(parseCornellTargetMetadata("left wide"), null)
})

test("places the annotation to the right without reserving a layout rail", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 200,
      targetLeft: 300,
      targetRight: 900,
      panelHeight: 240,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    {
      top: 200,
      left: 928,
      width: 320,
      maxHeight: 684,
      side: "right",
    },
  )
})

test("uses the left side when the right side is too narrow", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 200,
      targetLeft: 700,
      targetRight: 1200,
      panelHeight: 240,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    {
      top: 200,
      left: 352,
      width: 320,
      maxHeight: 684,
      side: "left",
    },
  )
})

test("keeps a long annotation inside the viewport", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 820,
      targetLeft: 700,
      targetRight: 1200,
      panelHeight: 400,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    {
      top: 484,
      left: 352,
      width: 320,
      maxHeight: 400,
      side: "left",
    },
  )
})

test("overlays the annotation when neither side has enough space", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 100,
      targetLeft: 120,
      targetRight: 680,
      panelHeight: 200,
      viewportWidth: 800,
      viewportHeight: 700,
    }),
    {
      top: 100,
      left: 240,
      width: 320,
      maxHeight: 584,
      side: "overlay",
    },
  )
})

test("emits syntactically valid standalone browser code", () => {
  assert.doesNotThrow(() => new Function(cornellCalloutScript))
  assert.match(cornellCalloutScript, /initializeCornellCallouts/)
})
