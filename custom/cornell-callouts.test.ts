import assert from "node:assert/strict"
import test from "node:test"

import {
  cornellCalloutScript,
  getCornellPanelPlacement,
  parseCornellTargetMetadata,
} from "./cornell-callouts"

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

test("places the annotation to the left of its target", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 200,
      targetLeft: 700,
      panelHeight: 240,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    {
      top: 200,
      left: 352,
      width: 320,
      maxHeight: 684,
    },
  )
})

test("keeps a long annotation inside the viewport", () => {
  assert.deepEqual(
    getCornellPanelPlacement({
      targetTop: 820,
      targetLeft: 700,
      panelHeight: 400,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    {
      top: 484,
      left: 352,
      width: 320,
      maxHeight: 400,
    },
  )
})

test("does not create a desktop panel when the left rail is too narrow", () => {
  assert.equal(
    getCornellPanelPlacement({
      targetTop: 100,
      targetLeft: 280,
      panelHeight: 200,
      viewportWidth: 800,
      viewportHeight: 700,
    }),
    null,
  )
})

test("emits syntactically valid standalone browser code", () => {
  assert.doesNotThrow(() => new Function(cornellCalloutScript))
  assert.match(cornellCalloutScript, /initializeCornellCallouts/)
})
