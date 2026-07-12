export type CornellPanelPlacement = {
  top: number
  left: number
  width: number
  maxHeight: number
}

type CornellPanelPlacementOptions = {
  targetTop: number
  targetLeft: number
  panelHeight: number
  viewportWidth: number
  viewportHeight: number
  gap?: number
  margin?: number
  minWidth?: number
  maxWidth?: number
  minVisibleHeight?: number
}

export function parseCornellTargetMetadata(value: unknown): string | null {
  if (typeof value !== "string") return null

  const match = value.trim().match(/^(?:target=)?([A-Za-z0-9-]+)$/i)
  return match?.[1].toLowerCase() ?? null
}

export function getCornellPanelPlacement({
  targetTop,
  targetLeft,
  panelHeight,
  viewportWidth,
  viewportHeight,
  gap = 28,
  margin = 16,
  minWidth = 260,
  maxWidth = 320,
  minVisibleHeight = 180,
}: CornellPanelPlacementOptions): CornellPanelPlacement | null {
  const availableWidth = Math.min(targetLeft - gap - margin, viewportWidth - margin * 2)
  if (availableWidth < minWidth) return null

  const width = Math.min(maxWidth, availableWidth)
  const visibleHeight = Math.min(Math.max(panelHeight, minVisibleHeight), viewportHeight * 0.72)
  const maximumTop = Math.max(margin, viewportHeight - visibleHeight - margin)
  const top = Math.min(Math.max(targetTop, margin), maximumTop)

  return {
    top,
    left: Math.max(margin, targetLeft - gap - width),
    width,
    maxHeight: Math.max(minVisibleHeight, viewportHeight - top - margin),
  }
}

export const cornellCalloutScript = String.raw`
${parseCornellTargetMetadata.toString()}
${getCornellPanelPlacement.toString()}

const cornellRootSelector = "article.cornell > .markdown-preview-view"
const cornellHoverDelay = 180
const cornellCloseDelay = 160

function initializeCornellCallouts() {
  if (!window.matchMedia("(min-width: 801px)").matches) return
  for (const root of document.querySelectorAll(cornellRootSelector)) {
    if (root.dataset.cornellAnnotationsReady === "true") continue

    const groups = new Map()
    const callouts = root.querySelectorAll(".callout[data-callout-metadata]")

    for (const callout of callouts) {
      if (callout.parentElement?.closest(".callout")) continue
      if (callout.dataset.callout === "summary") continue

      const targetId = parseCornellTargetMetadata(callout.dataset.calloutMetadata)
      if (!targetId) continue

      const target = root.querySelector('[id="' + targetId + '"]')
      if (!target || target.closest(".callout")) continue

      const group = groups.get(targetId) ?? { targetId, target, callouts: [] }
      group.callouts.push(callout)
      groups.set(targetId, group)
    }

    if (groups.size === 0) continue

    root.dataset.cornellAnnotationsReady = "true"
    root.classList.add("cornell-annotations-ready")

    const controller = new AbortController()
    const records = []
    let activeRecord = null
    let pinnedRecord = null
    let openTimer = 0
    let closeTimer = 0
    let positionFrame = 0

    function clearOpenTimer() {
      window.clearTimeout(openTimer)
      openTimer = 0
    }

    function clearCloseTimer() {
      window.clearTimeout(closeTimer)
      closeTimer = 0
    }

    function positionRecord(record) {
      if (!record || activeRecord !== record) return

      const targetRect = record.target.getBoundingClientRect()
      const placement = getCornellPanelPlacement({
        targetTop: targetRect.top,
        targetLeft: targetRect.left,
        panelHeight: record.panel.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })

      if (!placement) {
        record.panel.classList.remove("is-positioned")
        return
      }

      record.panel.style.setProperty("--cornell-panel-top", placement.top + "px")
      record.panel.style.setProperty("--cornell-panel-left", placement.left + "px")
      record.panel.style.setProperty("--cornell-panel-width", placement.width + "px")
      record.panel.style.setProperty("--cornell-panel-max-height", placement.maxHeight + "px")
      record.panel.classList.add("is-positioned")
    }

    function schedulePosition() {
      window.cancelAnimationFrame(positionFrame)
      positionFrame = window.requestAnimationFrame(() => positionRecord(activeRecord))
    }

    function deactivate(record) {
      if (!record) return

      record.panel.classList.remove("is-active", "is-pinned", "is-positioned")
      record.panel.setAttribute("aria-hidden", "true")
      record.target.classList.remove("is-cornell-annotation-active")
      record.trigger.setAttribute("aria-expanded", "false")
      record.trigger.setAttribute("aria-pressed", "false")

      if (activeRecord === record) activeRecord = null
      if (pinnedRecord === record) pinnedRecord = null
    }

    function activate(record, pin = false) {
      clearOpenTimer()
      clearCloseTimer()

      if (pinnedRecord && pinnedRecord !== record && !pin) return
      if (activeRecord && activeRecord !== record) deactivate(activeRecord)

      activeRecord = record
      if (pin) pinnedRecord = record

      record.panel.classList.add("is-active")
      record.panel.classList.toggle("is-pinned", pin)
      record.panel.setAttribute("aria-hidden", "false")
      record.target.classList.add("is-cornell-annotation-active")
      record.trigger.setAttribute("aria-expanded", "true")
      record.trigger.setAttribute("aria-pressed", pin ? "true" : "false")
      schedulePosition()
    }

    function scheduleOpen(record) {
      clearOpenTimer()
      clearCloseTimer()
      if (pinnedRecord && pinnedRecord !== record) return
      openTimer = window.setTimeout(() => activate(record), cornellHoverDelay)
    }

    function scheduleClose(record) {
      clearOpenTimer()
      clearCloseTimer()
      if (pinnedRecord === record) return
      closeTimer = window.setTimeout(() => deactivate(record), cornellCloseDelay)
    }

    let markerIndex = 0
    for (const group of groups.values()) {
      markerIndex += 1

      const panel = document.createElement("aside")
      panel.className = "cornell-annotation-panel"
      panel.id = "cornell-annotation-" + group.targetId
      panel.setAttribute("aria-hidden", "true")
      panel.setAttribute("aria-label", "연결된 주석")

      const closeButton = document.createElement("button")
      closeButton.type = "button"
      closeButton.className = "cornell-annotation-close"
      closeButton.setAttribute("aria-label", "주석 닫기")
      closeButton.textContent = "×"
      panel.append(closeButton)

      const placeholders = []
      for (const callout of group.callouts) {
        const placeholder = document.createComment("cornell-annotation-placeholder")
        callout.before(placeholder)
        placeholders.push({ callout, placeholder })
        callout.classList.add("cornell-annotation")
        panel.append(callout)
      }

      const title = group.callouts[0]?.querySelector(".callout-title-inner")?.textContent?.trim()
      const trigger = document.createElement("button")
      trigger.type = "button"
      trigger.className = "cornell-annotation-trigger"
      trigger.textContent = String(markerIndex)
      trigger.setAttribute("aria-controls", panel.id)
      trigger.setAttribute("aria-expanded", "false")
      trigger.setAttribute("aria-pressed", "false")
      trigger.setAttribute("aria-label", title ? "주석 열기: " + title : "연결된 주석 열기")

      group.target.classList.add("cornell-annotation-anchor")
      group.target.append(trigger)
      root.append(panel)

      const record = { ...group, panel, trigger, closeButton, placeholders }
      records.push(record)

      group.target.addEventListener("pointerenter", () => scheduleOpen(record), {
        signal: controller.signal,
      })
      group.target.addEventListener("pointerleave", () => scheduleClose(record), {
        signal: controller.signal,
      })
      group.target.addEventListener("focusin", () => activate(record), {
        signal: controller.signal,
      })
      group.target.addEventListener("focusout", () => scheduleClose(record), {
        signal: controller.signal,
      })
      panel.addEventListener("pointerenter", clearCloseTimer, { signal: controller.signal })
      panel.addEventListener("pointerleave", () => scheduleClose(record), {
        signal: controller.signal,
      })
      panel.addEventListener("focusin", clearCloseTimer, { signal: controller.signal })
      panel.addEventListener("focusout", () => scheduleClose(record), {
        signal: controller.signal,
      })
      trigger.addEventListener(
        "click",
        (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (pinnedRecord === record) {
            deactivate(record)
          } else {
            activate(record, true)
          }
        },
        { signal: controller.signal },
      )
      closeButton.addEventListener(
        "click",
        () => {
          deactivate(record)
          trigger.focus({ preventScroll: true })
        },
        { signal: controller.signal },
      )
    }

    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !activeRecord) return
      const trigger = activeRecord.trigger
      deactivate(activeRecord)
      trigger.focus({ preventScroll: true })
    }

    document.addEventListener("keydown", onKeyDown, { signal: controller.signal })
    window.addEventListener("resize", schedulePosition, { signal: controller.signal })
    window.addEventListener("scroll", schedulePosition, {
      passive: true,
      signal: controller.signal,
    })

    const cleanup = () => {
      clearOpenTimer()
      clearCloseTimer()
      window.cancelAnimationFrame(positionFrame)
      controller.abort()

      for (const record of records) {
        for (const { callout, placeholder } of record.placeholders) {
          callout.classList.remove("cornell-annotation")
          if (placeholder.parentNode) placeholder.replaceWith(callout)
        }
        record.target.classList.remove(
          "cornell-annotation-anchor",
          "is-cornell-annotation-active",
        )
        record.trigger.remove()
        record.panel.remove()
      }

      root.classList.remove("cornell-annotations-ready")
      delete root.dataset.cornellAnnotationsReady
    }

    if (typeof window.addCleanup === "function") window.addCleanup(cleanup)
  }
}

document.addEventListener("nav", initializeCornellCallouts)
document.addEventListener("render", initializeCornellCallouts)
initializeCornellCallouts()
`
