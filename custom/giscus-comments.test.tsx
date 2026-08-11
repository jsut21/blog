import assert from "node:assert/strict"
import test from "node:test"
import { render } from "preact-render-to-string"

import type { GlobalConfiguration } from "../quartz/cfg"
import type { QuartzComponentProps } from "../quartz/components/types"
import { GiscusComments, resolveDiscussionNumber, resolvePostId } from "./giscus-comments"

const options = {
  provider: "giscus" as const,
  options: {
    repo: "jsut21/blog" as const,
    repoId: "repo-id",
    category: "Announcements",
    categoryId: "category-id",
    lang: "ko",
  },
}

const baseProps = {
  cfg: { baseUrl: "lis-blog.pages.dev" } as GlobalConfiguration,
  displayClass: undefined,
} as unknown as Pick<QuartzComponentProps, "cfg" | "displayClass">

function renderComments(frontmatter: Record<string, unknown>): string {
  const Comments = GiscusComments(options)
  return render(
    Comments({
      ...baseProps,
      fileData: { frontmatter },
    } as unknown as QuartzComponentProps),
  )
}

test("resolves only positive discussion numbers", () => {
  assert.equal(resolveDiscussionNumber({ discussionNumber: 11 }), 11)
  assert.equal(resolveDiscussionNumber({ discussionNumber: "8" }), 8)
  assert.equal(resolveDiscussionNumber({ discussionNumber: 0 }), undefined)
  assert.equal(resolveDiscussionNumber({ discussionNumber: "not-a-number" }), undefined)
})

test("resolves a non-empty stable post id", () => {
  assert.equal(resolvePostId({ postId: " post-pdf-structure-v1 " }), "post-pdf-structure-v1")
  assert.equal(resolvePostId({ postId: "" }), undefined)
  assert.equal(resolvePostId({ postId: 4 }), undefined)
})

test("uses discussion number mapping when page metadata has a number", () => {
  const html = renderComments({ postId: "post-slide-v1", discussionNumber: 11 })

  assert.match(html, /data-mapping="number"/)
  assert.match(html, /data-number="11"/)
  assert.match(html, /data-post-id="post-slide-v1"/)
})

test("does not create an untracked URL-mapped discussion before assignment", () => {
  const html = renderComments({ postId: "post-new-v1" })

  assert.equal(html, "")
})

test("requires a stable post id even when a discussion number exists", () => {
  assert.equal(renderComments({ discussionNumber: 11 }), "")
})

test("honors the per-page comments opt-out", () => {
  assert.equal(renderComments({ comments: false }), "")
})
