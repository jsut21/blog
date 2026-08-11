import assert from "node:assert/strict"
import test from "node:test"

import {
  discussionBody,
  discussionTitle,
  graphqlString,
  parseMarkdown,
  postIdMarker,
  updateFrontmatter,
} from "./sync-comment-discussions.mjs"

test("updates frontmatter without changing the Markdown body", () => {
  const source = "notes/example.md"
  const raw = "---\ntitle: Example\npublish: true\ncommit: true\n---\n\n# Body\n\nKeep this text.\n"
  const updated = updateFrontmatter(
    raw,
    { postId: "post-example-v1", discussionNumber: 42 },
    source,
  )

  assert.match(updated, /postId: post-example-v1/)
  assert.match(updated, /discussionNumber: 42/)
  assert.equal(updated.slice(updated.indexOf("---\n", 4) + 4), "\n# Body\n\nKeep this text.\n")
})

test("preserves CRLF frontmatter when adding a mapping", () => {
  const raw = "---\r\ntitle: Example\r\npublish: true\r\ncommit: true\r\n---\r\n\r\nBody\r\n"
  const updated = updateFrontmatter(raw, { discussionNumber: 7 }, "notes/example.md")

  assert.match(updated, /discussionNumber: 7\r\n---\r\n/)
  assert.doesNotMatch(updated, /[^\r]\n/)
})

test("creates a stable marker and non-path-dependent Discussion body", () => {
  const postId = "post-example-v1"
  assert.equal(postIdMarker(postId), "<!-- quartz-post-id: post-example-v1 -->")
  assert.match(discussionBody(postId), /quartz-post-id: post-example-v1/)
  assert.doesNotMatch(discussionBody(postId), /notes\//)
})

test("truncates Discussion titles to GitHub's title limit", () => {
  const title = "가".repeat(400)
  const value = discussionTitle("notes/example.md", { title })
  assert.equal(value.length, 256)
  assert.match(value, /^댓글: /)
  assert.match(value, /\.\.\.$/)
})

test("encodes GraphQL strings safely", () => {
  const value = 'title with "quotes" and \\ slash\nnext line'
  const encoded = graphqlString(value)
  assert.equal(JSON.parse(encoded), value)
})

test("parses Markdown frontmatter as a mapping", () => {
  const parsed = parseMarkdown("---\npostId: post-1\n---\nBody", "notes/example.md")
  assert.deepEqual(parsed.data, { postId: "post-1" })
  assert.equal(parsed.hasFrontmatter, true)
})
