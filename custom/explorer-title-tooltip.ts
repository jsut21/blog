export const explorerTitleTooltipScript = String.raw`
const explorerTitleSelector =
  ".explorer-content .nav-file-title, .explorer-content .folder-button"

function setExplorerTitleTooltips(root = document) {
  for (const entry of root.querySelectorAll(explorerTitleSelector)) {
    const label = entry.textContent?.trim()
    if (label) entry.setAttribute("title", label)
  }
}

function initializeExplorerTitleTooltips() {
  for (const explorer of document.querySelectorAll(".explorer-content")) {
    setExplorerTitleTooltips(explorer)

    if (explorer.dataset.titleTooltipReady === "true") continue
    explorer.dataset.titleTooltipReady = "true"

    const observer = new MutationObserver(() => setExplorerTitleTooltips(explorer))
    observer.observe(explorer, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    if (typeof window.addCleanup === "function") {
      window.addCleanup(() => observer.disconnect())
    }
  }
}

document.addEventListener("nav", initializeExplorerTitleTooltips)
document.addEventListener("render", initializeExplorerTitleTooltips)
initializeExplorerTitleTooltips()
`
