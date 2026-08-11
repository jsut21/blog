import { h } from "preact"
import { componentRegistry } from "../quartz/components/registry"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../quartz/components/types"

type CommentsMapping = "url" | "title" | "og:title" | "specific" | "number" | "pathname"

export type GiscusCommentsOptions = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string
    themeUrl?: string
    lightTheme?: string
    darkTheme?: string
    mapping?: CommentsMapping
    strict?: boolean
    reactionsEnabled?: boolean
    inputPosition?: "top" | "bottom"
    lang?: string
  }
}

type Frontmatter = Record<string, unknown>

const componentSource = "custom/giscus-comments"

function asFrontmatter(value: unknown): Frontmatter {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Frontmatter) : {}
}

function boolToStringBool(value: boolean): string {
  return value ? "1" : "0"
}

export function resolveDiscussionNumber(frontmatter: unknown): number | undefined {
  const raw = asFrontmatter(frontmatter).discussionNumber
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw

  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const parsed = Number(raw.trim())
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed
  }

  return undefined
}

export function resolvePostId(frontmatter: unknown): string | undefined {
  const raw = asFrontmatter(frontmatter).postId
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined
}

const commentsScript = `
const changeTheme = (event) => {
  const theme = event.detail.theme
  const iframe = document.querySelector("iframe.giscus-frame")
  if (!iframe || !iframe.contentWindow) return

  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme: getThemeUrl(getThemeName(theme)) } } },
    "https://giscus.app",
  )
}

const getThemeName = (theme) => {
  if (theme !== "dark" && theme !== "light") return theme
  const container = document.querySelector(".giscus")
  if (!container) return theme
  const darkTheme = container.dataset.darkTheme ?? "dark"
  const lightTheme = container.dataset.lightTheme ?? "light"
  return theme === "dark" ? darkTheme : lightTheme
}

const getThemeUrl = (theme) => {
  const container = document.querySelector(".giscus")
  if (!container) return "https://giscus.app/themes/" + theme + ".css"
  return (container.dataset.themeUrl ?? "https://giscus.app/themes") + "/" + theme + ".css"
}

const cleanup = []
const addCleanup = (fn) => cleanup.push(fn)

if (typeof document !== "undefined") {
  const setupComments = () => {
    cleanup.forEach((fn) => fn())
    cleanup.length = 0

    const container = document.querySelector(".giscus")
    if (!container) return

    const script = document.createElement("script")
    script.src = "https://giscus.app/client.js"
    script.async = true
    script.crossOrigin = "anonymous"
    script.setAttribute("data-loading", "lazy")
    script.setAttribute("data-emit-metadata", "0")
    script.setAttribute("data-repo", container.dataset.repo)
    script.setAttribute("data-repo-id", container.dataset.repoId)
    script.setAttribute("data-category", container.dataset.category)
    script.setAttribute("data-category-id", container.dataset.categoryId)
    script.setAttribute("data-mapping", container.dataset.mapping)
    script.setAttribute("data-strict", container.dataset.strict)
    script.setAttribute("data-reactions-enabled", container.dataset.reactionsEnabled)
    script.setAttribute("data-input-position", container.dataset.inputPosition)
    script.setAttribute("data-lang", container.dataset.lang)

    const discussionNumber = container.dataset.number
    if (discussionNumber) script.setAttribute("data-number", discussionNumber)

    const theme = document.documentElement.getAttribute("saved-theme")
    if (theme) script.setAttribute("data-theme", getThemeUrl(getThemeName(theme)))

    container.appendChild(script)

    document.addEventListener("themechange", changeTheme)
    addCleanup(() => document.removeEventListener("themechange", changeTheme))
  }

  document.addEventListener("nav", setupComments)
  document.addEventListener("render", setupComments)
}
`

export const GiscusComments = ((opts: GiscusCommentsOptions) => {
  const Comments: QuartzComponent = ({ displayClass, fileData, cfg }: QuartzComponentProps) => {
    const frontmatter = asFrontmatter(fileData.frontmatter)
    const commentsOverride = frontmatter.comments
    if (commentsOverride === false || commentsOverride === "false") return null

    const discussionNumber = resolveDiscussionNumber(frontmatter)
    // A URL/path mapping can create a second, untracked Discussion before the
    // Publication Manager has assigned the stable number. Keep the page
    // comment-free until the explicit mapping has been written.
    if (discussionNumber === undefined) return null

    const postId = resolvePostId(frontmatter)
    if (!postId) return null

    return h("div", {
      class: displayClass ? `${displayClass} giscus` : "giscus",
      "data-repo": opts.options.repo,
      "data-repo-id": opts.options.repoId,
      "data-category": opts.options.category,
      "data-category-id": opts.options.categoryId,
      "data-mapping": "number",
      "data-number": String(discussionNumber),
      "data-post-id": postId,
      "data-strict": boolToStringBool(opts.options.strict ?? true),
      "data-reactions-enabled": boolToStringBool(opts.options.reactionsEnabled ?? true),
      "data-input-position": opts.options.inputPosition ?? "bottom",
      "data-light-theme": opts.options.lightTheme ?? "light",
      "data-dark-theme": opts.options.darkTheme ?? "dark",
      "data-theme-url":
        opts.options.themeUrl ?? `https://${cfg.baseUrl ?? "example.com"}/static/giscus`,
      "data-lang": opts.options.lang ?? "en",
    })
  }

  Comments.afterDOMLoaded = commentsScript
  return Comments
}) satisfies QuartzComponentConstructor<GiscusCommentsOptions>

/** Replace the installed community component with the tracked, page-aware implementation. */
export function patchGiscusComments(): void {
  const registered = componentRegistry.get("comments")
  if (!registered) {
    throw new Error("The Giscus comments component must be installed before applying its mapping")
  }
  if (registered.source === componentSource) return

  for (const key of ["comments", "Comments", "comments/Comments"]) {
    if (componentRegistry.get(key)) {
      componentRegistry.register(
        key,
        GiscusComments as unknown as QuartzComponentConstructor,
        componentSource,
        registered.manifest,
      )
    }
  }
}
