type ExplorerSortNode = {
  isFolder: boolean
  displayName?: string
  fileSegmentHint?: string
  slugSegment?: string
  slugSegments?: string[]
}

/**
 * Keep the public Explorer's root folders in the same order as sortspec.md.
 *
 * The Explorer serializes this comparator and executes it in the browser, so
 * the order list intentionally lives inside the function instead of being a
 * module-level closure.
 */
export function orderedExplorerSort(a: ExplorerSortNode, b: ExplorerSortNode): number {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1

  const aName = a.displayName || a.fileSegmentHint || a.slugSegment || ""
  const bName = b.displayName || b.fileSegmentHint || b.slugSegment || ""

  if (a.isFolder && b.isFolder && a.slugSegments?.length === 1 && b.slugSegments?.length === 1) {
    const folderOrder = [
      "분류 전",
      "Kanban",
      "Project",
      "Area of Responsibility",
      "Resource",
      "Archive",
      "Daily notes",
      "Excalidraw",
    ]
    const aIndex = folderOrder.indexOf(aName)
    const bIndex = folderOrder.indexOf(bName)
    const aRank = aIndex === -1 ? folderOrder.length : aIndex
    const bRank = bIndex === -1 ? folderOrder.length : bIndex

    if (aRank !== bRank) return aRank - bRank
  }

  return aName.localeCompare(bName, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}
