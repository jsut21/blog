import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PageTypes } from "./quartz/plugins"
import BlogFooter from "./custom/BlogFooter"
import { BlogCustomizations, withKoreanOgFonts } from "./custom/blog-customizations"
import { patchGraphSlugDecoding } from "./custom/graph-slug-decoding"
import { applyPublicationControls } from "./custom/publication-controls"

const config = await loadQuartzConfig()

const obsidianIndex = config.plugins.transformers.findIndex(
  (plugin) => plugin.name === "ObsidianFlavoredMarkdown",
)
const customizationIndex = obsidianIndex === -1 ? config.plugins.transformers.length : obsidianIndex
config.plugins.transformers.splice(customizationIndex, 0, BlogCustomizations())

const ogImageIndex = config.plugins.emitters.findIndex((plugin) => plugin.name === "CustomOgImages")
if (ogImageIndex === -1) {
  throw new Error("The og-image plugin must be enabled before applying the Korean font override")
}
config.plugins.emitters[ogImageIndex] = withKoreanOgFonts(config.plugins.emitters[ogImageIndex])

const blogFooter = BlogFooter({
  links: {
    GitHub: "https://github.com/jsut21",
  },
})
const loadedLayout = await loadQuartzLayout({
  defaults: {
    footer: blogFooter,
  },
})
for (const pageLayout of Object.values(loadedLayout.byPageType)) {
  pageLayout.footer = blogFooter
}

const graphComponents = patchGraphSlugDecoding([
  loadedLayout.defaults,
  ...Object.values(loadedLayout.byPageType),
])
if (graphComponents === 0) {
  throw new Error("The graph component must be configured before applying slug decoding")
}

const dispatcherIndex = config.plugins.emitters.findIndex(
  (plugin) => plugin.name === "PageTypeDispatcher",
)
if (dispatcherIndex === -1) {
  throw new Error("The page type dispatcher must be configured before applying layout overrides")
}
config.plugins.emitters[dispatcherIndex] = PageTypes.PageTypeDispatcher({
  defaults: loadedLayout.defaults,
  byPageType: loadedLayout.byPageType,
})

applyPublicationControls(config)

export default config
export const layout = loadedLayout
