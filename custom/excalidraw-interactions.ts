export type ExcalidrawViewTransform = {
  zoom: number
  panX: number
  panY: number
}

export type ExcalidrawViewPoint = {
  x: number
  y: number
}

export const excalidrawMinZoom = 0.1
export const excalidrawMaxZoom = 20
export const excalidrawZoomStep = 0.15

export function zoomAroundPoint(
  transform: ExcalidrawViewTransform,
  nextZoom: number,
  point: ExcalidrawViewPoint,
): ExcalidrawViewTransform {
  const ratio = nextZoom / transform.zoom

  return {
    zoom: nextZoom,
    panX: point.x - (point.x - transform.panX) * ratio,
    panY: point.y - (point.y - transform.panY) * ratio,
  }
}

export const excalidrawInteractionScript = String.raw`
${zoomAroundPoint.toString()}

const EXCALIDRAW_MIN_ZOOM = ${excalidrawMinZoom}
const EXCALIDRAW_MAX_ZOOM = ${excalidrawMaxZoom}
const EXCALIDRAW_ZOOM_STEP = ${excalidrawZoomStep}

function initExcalidraw() {
  const framePage = document.querySelector(".page[data-frame='excalidraw']")
  if (framePage) {
    initSidebar(framePage)
    initPanZoom(framePage)
    return
  }

  for (const page of document.querySelectorAll(".excalidraw-page")) {
    initPanZoom(page)
  }
}

function initSidebar(page) {
  const toggle = page.querySelector(".excalidraw-sidebar-toggle")
  if (!toggle || toggle.dataset.excalidrawSidebarReady === "true") return

  toggle.dataset.excalidrawSidebarReady = "true"
  const handleToggle = () => page.classList.toggle("excalidraw-sidebar-open")
  toggle.addEventListener("click", handleToggle)

  window.addCleanup(() => {
    toggle.removeEventListener("click", handleToggle)
    delete toggle.dataset.excalidrawSidebarReady
    page.classList.remove("excalidraw-sidebar-open")
  })
}

function initPanZoom(page) {
  const container = page.querySelector(".excalidraw-container")
  if (!container || container.dataset.excalidrawPanZoomReady === "true") return

  const svg = container.querySelector("svg")
  if (!svg) return

  container.dataset.excalidrawPanZoomReady = "true"
  container.style.backgroundColor = "var(--excalidraw-bg, var(--light))"

  const overlaysContainer = page.querySelector(".excalidraw-overlays")
  let zoom = 1
  let panX = 0
  let panY = 0
  let isDragging = false
  let startX = 0
  let startY = 0

  function positionOverlays() {
    if (!overlaysContainer) return
    const overlays = overlaysContainer.querySelectorAll(".excalidraw-overlay")
    if (overlays.length === 0) return

    const offsetX = parseFloat(overlaysContainer.getAttribute("data-offset-x")) || 0
    const offsetY = parseFloat(overlaysContainer.getAttribute("data-offset-y")) || 0
    const ctm = svg.getScreenCTM()
    const containerRect = container.getBoundingClientRect()
    if (!ctm) return

    for (const overlay of overlays) {
      const elementX = parseFloat(overlay.getAttribute("data-x")) || 0
      const elementY = parseFloat(overlay.getAttribute("data-y")) || 0
      const elementWidth = parseFloat(overlay.getAttribute("data-w")) || 0
      const elementHeight = parseFloat(overlay.getAttribute("data-h")) || 0
      const svgX = elementX + offsetX
      const svgY = elementY + offsetY

      overlay.style.left = svgX * ctm.a + ctm.e - containerRect.left + "px"
      overlay.style.top = svgY * ctm.d + ctm.f - containerRect.top + "px"
      overlay.style.width = elementWidth * ctm.a + "px"
      overlay.style.height = elementHeight * ctm.d + "px"
      overlay.style.display = "flex"
    }
  }

  function applyTransform() {
    svg.style.transform =
      "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")"
    positionOverlays()
  }

  function clampZoom(value) {
    return Math.max(EXCALIDRAW_MIN_ZOOM, Math.min(EXCALIDRAW_MAX_ZOOM, value))
  }

  function setZoomAroundClientPoint(nextZoom, clientX, clientY) {
    const rect = container.getBoundingClientRect()
    const next = zoomAroundPoint(
      { zoom, panX, panY },
      clampZoom(nextZoom),
      { x: clientX - rect.left, y: clientY - rect.top },
    )
    zoom = next.zoom
    panX = next.panX
    panY = next.panY
    applyTransform()
  }

  function zoomAroundCenter(nextZoom) {
    const rect = container.getBoundingClientRect()
    setZoomAroundClientPoint(nextZoom, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  function handleWheel(event) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -EXCALIDRAW_ZOOM_STEP : EXCALIDRAW_ZOOM_STEP
    setZoomAroundClientPoint(zoom + delta, event.clientX, event.clientY)
  }

  function handleMouseDown(event) {
    if (event.button !== 0) return
    isDragging = true
    startX = event.clientX - panX
    startY = event.clientY - panY
    container.style.cursor = "grabbing"
  }

  function handleMouseMove(event) {
    if (!isDragging) return
    panX = event.clientX - startX
    panY = event.clientY - startY
    applyTransform()
  }

  function handleMouseUp() {
    isDragging = false
    container.style.cursor = "grab"
  }

  const zoomInButton = page.querySelector(".excalidraw-zoom-in")
  const zoomOutButton = page.querySelector(".excalidraw-zoom-out")
  const resetButton = page.querySelector(".excalidraw-reset")
  const handleZoomIn = () => zoomAroundCenter(zoom + EXCALIDRAW_ZOOM_STEP)
  const handleZoomOut = () => zoomAroundCenter(zoom - EXCALIDRAW_ZOOM_STEP)
  const handleReset = () => {
    zoom = 1
    panX = 0
    panY = 0
    applyTransform()
  }

  zoomInButton?.addEventListener("click", handleZoomIn)
  zoomOutButton?.addEventListener("click", handleZoomOut)
  resetButton?.addEventListener("click", handleReset)

  let lastTouchDistance = 0

  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      isDragging = true
      startX = event.touches[0].clientX - panX
      startY = event.touches[0].clientY - panY
    } else if (event.touches.length === 2) {
      isDragging = false
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy)
    }
  }

  function handleTouchMove(event) {
    event.preventDefault()
    if (event.touches.length === 1 && isDragging) {
      panX = event.touches[0].clientX - startX
      panY = event.touches[0].clientY - startY
      applyTransform()
    } else if (event.touches.length === 2 && lastTouchDistance > 0) {
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const scale = distance / lastTouchDistance
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      setZoomAroundClientPoint(zoom * scale, centerX, centerY)
      lastTouchDistance = distance
    }
  }

  function handleTouchEnd() {
    isDragging = false
    lastTouchDistance = 0
  }

  positionOverlays()
  container.addEventListener("wheel", handleWheel, { passive: false })
  container.addEventListener("mousedown", handleMouseDown)
  document.addEventListener("mousemove", handleMouseMove)
  document.addEventListener("mouseup", handleMouseUp)
  container.addEventListener("touchstart", handleTouchStart, { passive: true })
  container.addEventListener("touchmove", handleTouchMove, { passive: false })
  container.addEventListener("touchend", handleTouchEnd)

  window.addCleanup(() => {
    container.removeEventListener("wheel", handleWheel)
    container.removeEventListener("mousedown", handleMouseDown)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    container.removeEventListener("touchstart", handleTouchStart)
    container.removeEventListener("touchmove", handleTouchMove)
    container.removeEventListener("touchend", handleTouchEnd)
    zoomInButton?.removeEventListener("click", handleZoomIn)
    zoomOutButton?.removeEventListener("click", handleZoomOut)
    resetButton?.removeEventListener("click", handleReset)
    delete container.dataset.excalidrawPanZoomReady
  })
}

document.addEventListener("nav", initExcalidraw)
`
