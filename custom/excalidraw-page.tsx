import {
  cloneElement,
  toChildArray,
  type ComponentChild,
  type ComponentChildren,
  type VNode,
} from "preact"

import type { QuartzComponent } from "../quartz/components/types"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import { excalidrawInteractionScript } from "./excalidraw-interactions"

const darkThemeSelector = /:root\[saved-theme=(?:"dark"|'dark'|dark)\]\s*\{/
const bundledZoomMarker = "excalidraw-zoom-in"
const literalStrokeColor = /\bstroke="(#[0-9a-f]{3,8})"/gi

type PatchableVNodeProps = {
  class?: unknown
  className?: unknown
  children?: ComponentChildren
  dangerouslySetInnerHTML?: { __html?: unknown }
}

function classValue(props: PatchableVNodeProps): string {
  if (typeof props.class === "string") return props.class
  return typeof props.className === "string" ? props.className : ""
}

export function patchExcalidrawSvgThemeColors(svg: string): string {
  return svg.replace(literalStrokeColor, (_match, color: string) => {
    const normalized = color.toLowerCase()
    return `stroke="var(--excalidraw-color-${normalized.slice(1)}, ${color})"`
  })
}

function patchExcalidrawSvgNode(node: ComponentChild): ComponentChild {
  if (typeof node !== "object" || node === null || !("props" in node)) return node

  const vnode = node as VNode<PatchableVNodeProps>
  const classNames = classValue(vnode.props).split(/\s+/)
  if (classNames.includes("excalidraw-container")) {
    const innerHtml = vnode.props.dangerouslySetInnerHTML
    if (typeof innerHtml?.__html !== "string") return node
    return cloneElement(vnode, {
      dangerouslySetInnerHTML: {
        ...innerHtml,
        __html: patchExcalidrawSvgThemeColors(innerHtml.__html),
      },
    })
  }

  const children = toChildArray(vnode.props.children)
  if (children.length === 0) return node

  let changed = false
  const patchedChildren = children.map((child) => {
    const patched = patchExcalidrawSvgNode(child)
    changed ||= patched !== child
    return patched
  })
  return changed ? cloneElement(vnode, {}, ...patchedChildren) : node
}

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

function withDrawingEnhancements(component: QuartzComponent): QuartzComponent {
  const wrapped: QuartzComponent = (props) => {
    const rendered = component(props)
    const options = props.fileData.excalidrawOptions as { darkMode?: unknown } | undefined
    if (typeof rendered !== "object" || rendered === null) return rendered

    const patched = patchExcalidrawSvgNode(rendered) as VNode<PatchableVNodeProps>
    if (options?.darkMode !== "dark") return patched

    return cloneElement(patched, {
      class: [classValue(patched.props), "excalidraw-theme-dark"].filter(Boolean).join(" "),
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

      const wrapped = withDrawingEnhancements(component)
      wrapped.css = css.value
      wrapped.afterDOMLoaded = script.value
      return wrapped
    }
  }

  return excalidrawPages.length
}
