import type { FullPageLayout } from "../quartz/cfg"
import type { QuartzComponent } from "../quartz/components/types"

const graphScriptMarker = "graph-visited"
const rawPathname = "window.location.pathname"
const decodedPathname = `decodeURI(${rawPathname})`

function componentsIn(layout: Partial<FullPageLayout>): Array<QuartzComponent | undefined> {
  return [
    layout.head,
    layout.pageBody,
    layout.footer,
    ...(layout.header ?? []),
    ...(layout.beforeBody ?? []),
    ...(layout.afterBody ?? []),
    ...(layout.left ?? []),
    ...(layout.right ?? []),
  ]
}

export function patchGraphSlugDecoding(layouts: Iterable<Partial<FullPageLayout>>): number {
  const components = new Set<QuartzComponent>()

  for (const layout of layouts) {
    for (const component of componentsIn(layout)) {
      if (component) components.add(component)
    }
  }

  let graphComponents = 0
  for (const component of components) {
    const resource = component.afterDOMLoaded
    if (!resource) continue

    const scripts = Array.isArray(resource) ? resource : [resource]
    if (!scripts.some((script) => script.includes(graphScriptMarker))) continue

    graphComponents++
    const patched = scripts.map((script) => {
      if (!script.includes(graphScriptMarker) || script.includes(decodedPathname)) {
        return script
      }
      if (!script.includes(rawPathname)) {
        throw new Error("The graph URL reader changed; verify non-ASCII slug decoding")
      }

      return script.replace(rawPathname, decodedPathname)
    })

    component.afterDOMLoaded = Array.isArray(resource) ? patched : patched[0]
  }

  return graphComponents
}
