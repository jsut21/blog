import { Explorer } from "../.quartz/plugins"
import { orderedExplorerSort } from "./ordered-explorer"

export function configureOrderedExplorer(): void {
  Explorer({ sortFn: orderedExplorerSort })
}
