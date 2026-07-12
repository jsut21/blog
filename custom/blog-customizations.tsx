import type { Element, Root as HtmlRoot } from "hast"
import type { Blockquote, Paragraph, Root as MarkdownRoot, Text } from "mdast"
import { visit } from "unist-util-visit"
import type { VFile } from "vfile"

import type { BuildCtx } from "../quartz/util/ctx"
import type { QuartzEmitterPluginInstance, QuartzTransformerPlugin } from "../quartz/plugins/types"
import { explorerTitleTooltipScript } from "./explorer-title-tooltip"

const googleSiteVerification = "W8IVa27qjis0c6LMSVWmujXE1G7tqUpRu9bP9axXUiA"
const koreanOgFont = "Noto Sans KR"
const cueAliases = new Set(["cue", "q", "k", "question", "keyword", "term"])
const summaryAliases = new Set(["summary", "reflection"])
const calloutDirective = /^\[!([\w-]+)(\|[^\]]+)?\]([+-]?)(.*)$/

type CornellFrontmatter = {
  cornell?: unknown
  cssclasses?: unknown
}

function isCornellNote(file: VFile): boolean {
  const frontmatter = file.data.frontmatter as CornellFrontmatter | undefined
  return frontmatter?.cornell === true
}

function addCornellClass(file: VFile): void {
  const frontmatter = file.data.frontmatter as CornellFrontmatter
  const current = frontmatter.cssclasses
  const classes = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === "string")
    : typeof current === "string"
      ? current.split(/\s+/).filter(Boolean)
      : []

  frontmatter.cssclasses = [...new Set([...classes, "cornell"])]
}

function normalizeCornellCallout(node: Blockquote): void {
  const firstParagraph = node.children[0] as Paragraph | undefined
  if (firstParagraph?.type !== "paragraph") return

  const firstText = firstParagraph.children[0] as Text | undefined
  if (firstText?.type !== "text") return

  const match = firstText.value.match(calloutDirective)
  if (!match) return

  const [, rawType, metadata = "", collapse = "", rawTitle = ""] = match
  const type = rawType.toLowerCase()

  if (cueAliases.has(type)) {
    firstText.value = `[!cue${metadata}]${collapse}${rawTitle}`
    return
  }

  if (summaryAliases.has(type)) {
    const title = rawTitle.trim().length > 0 ? rawTitle : " Summary"
    firstText.value = `[!cornell-summary${metadata}]${collapse}${title}`
  }
}

function restoreSummaryCallout(node: Element): void {
  const properties = node.properties
  const callout = properties["data-callout"] ?? properties.dataCallout
  if (callout !== "cornell-summary") return

  if (properties["data-callout"] !== undefined) {
    properties["data-callout"] = "summary"
  }
  if (properties.dataCallout !== undefined) {
    properties.dataCallout = "summary"
  }

  const className = properties.className
  if (Array.isArray(className)) {
    properties.className = className.map((value) =>
      value === "cornell-summary" ? "summary" : value,
    )
  } else if (typeof className === "string") {
    properties.className = className.replaceAll("cornell-summary", "summary")
  }
}

export const BlogCustomizations: QuartzTransformerPlugin = () => ({
  name: "BlogCustomizations",
  markdownPlugins() {
    return [
      () => (tree: MarkdownRoot, file: VFile) => {
        if (!isCornellNote(file)) return

        addCornellClass(file)
        visit(tree, "blockquote", normalizeCornellCallout)
      },
    ]
  },
  htmlPlugins() {
    return [
      () => (tree: HtmlRoot, file: VFile) => {
        if (!isCornellNote(file)) return
        visit(tree, "element", restoreSummaryCallout)
      },
    ]
  },
  externalResources() {
    return {
      js: [
        {
          script: explorerTitleTooltipScript,
          loadTime: "afterDOMReady",
          contentType: "inline",
          spaPreserve: true,
        },
      ],
      additionalHead: [<meta name="google-site-verification" content={googleSiteVerification} />],
    }
  },
})

function withKoreanOgTheme(ctx: BuildCtx): BuildCtx {
  const configuration = ctx.cfg.configuration
  const theme = configuration.theme

  return {
    ...ctx,
    cfg: {
      ...ctx.cfg,
      configuration: {
        ...configuration,
        theme: {
          ...theme,
          typography: {
            ...theme.typography,
            header: koreanOgFont,
            body: koreanOgFont,
          },
        },
      },
    },
  }
}

export function withKoreanOgFonts(
  emitter: QuartzEmitterPluginInstance,
): QuartzEmitterPluginInstance {
  const wrapped: QuartzEmitterPluginInstance = {
    ...emitter,
    emit(ctx, content, resources) {
      return emitter.emit(withKoreanOgTheme(ctx), content, resources)
    },
  }

  if (emitter.partialEmit) {
    wrapped.partialEmit = (ctx, content, resources, changeEvents) =>
      emitter.partialEmit!(withKoreanOgTheme(ctx), content, resources, changeEvents)
  }

  return wrapped
}
