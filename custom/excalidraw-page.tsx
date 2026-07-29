import { cloneElement, type VNode } from "preact"

import type { QuartzComponent } from "../quartz/components/types"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import { excalidrawInteractionScript } from "./excalidraw-interactions"

const darkThemeSelector = /:root\[saved-theme=(?:"dark"|'dark'|dark)\]\s*\{/
const bundledZoomMarker = "excalidraw-zoom-in"

function patchResource(
  resource: string | string[] | undefined,
  patch: (value: string) => { value: string; matched: boolean },
): { value: string | string[] | undefined; matched: boolean } {
  if (resource === undefined) return { value: undefined, matched: false }

  const values = Array.isArray(resource) ? resource : [resource]
  let matched = false
  const patched = values.map((value) => {
    const result = patch(value)
    matched ||= result.matched
    return result.value
  })

  return {
    value: Array.isArray(resource) ? patched : patched[0],
    matched,
  }
}

function patchDarkThemeCss(resource: string | string[] | undefined) {
  return patchResource(resource, (value) => {
    if (value.includes(".excalidraw-theme-dark")) {
      return { value, matched: true }
    }

    const match = value.match(darkThemeSelector)?.[0]
    if (!match) return { value, matched: false }

    const selector = match.slice(0, -1).trimEnd()
    return {
      value: value.replace(match, `${selector},\n.excalidraw-theme-dark {`),
      matched: true,
    }
  })
}

function replaceInteractionScript(resource: string | string[] | undefined) {
  return patchResource(resource, (value) => {
    if (!value.includes(bundledZoomMarker)) return { value, matched: false }
    return { value: excalidrawInteractionScript, matched: true }
  })
}

function withDarkDrawingClass(component: QuartzComponent): QuartzComponent {
  const wrapped: QuartzComponent = (props) => {
    const rendered = component(props)
    const options = props.fileData.excalidrawOptions as { darkMode?: unknown } | undefined
    if (options?.darkMode !== "dark" || typeof rendered !== "object" || rendered === null) {
      return rendered
    }

    const vnode = rendered as VNode<{ class?: unknown; className?: unknown }>
    const currentClass =
      typeof vnode.props.class === "string"
        ? vnode.props.class
        : typeof vnode.props.className === "string"
          ? vnode.props.className
          : ""

    return cloneElement(vnode, {
      class: [currentClass, "excalidraw-theme-dark"].filter(Boolean).join(" "),
    })
  }

  wrapped.displayName = component.displayName
  wrapped.beforeDOMLoaded = component.beforeDOMLoaded
  return wrapped
}

export function patchExcalidrawPage(pageTypes: PageTypePluginEntry[] | undefined): number {
  const excalidrawPages = (pageTypes ?? []).filter((pageType) => pageType.name === "ExcalidrawPage")

  for (const pageType of excalidrawPages) {
    const originalBody = pageType.body
    pageType.body = (options) => {
      const component = originalBody(options)
      const css = patchDarkThemeCss(component.css)
      if (!css.matched) {
        throw new Error("The Excalidraw dark-theme CSS changed; verify the scoped theme patch")
      }

      const script = replaceInteractionScript(component.afterDOMLoaded)
      if (!script.matched) {
        throw new Error("The Excalidraw interaction script changed; verify the pan and zoom patch")
      }

      const wrapped = withDarkDrawingClass(component)
      wrapped.css = css.value
      wrapped.afterDOMLoaded = script.value
      return wrapped
    }
  }

  return excalidrawPages.length
}
