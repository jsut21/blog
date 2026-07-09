---
title: Quartz v5 마이그레이션 계획
created: 2026-07-09
draft: false
commit: false
tags:
  - quartz
  - migration
  - obsidian
  - blog
---

# Quartz v5 마이그레이션 계획

마이그레이션 전 블로그는 Quartz `v4.5.2`를 사용했다.

```text
branch: v4
package.json version: 4.5.2
```

upstream Quartz의 현재 기본 브랜치는 `v5`이고, 공식 문서 기준 버전은 `v5.0.0`이다.

## 진행 결과

2026-07-09 기준으로 v5 migration 브랜치를 만들고 1차 빌드까지 확인했다.

- 로컬 백업 브랜치: `backup/pre-quartz-v5-20260709`
- 백업 커밋: `f723675 chore: snapshot before quartz v5 migration`
- 마이그레이션 브랜치: `migration/quartz-v5`
- 기준 브랜치: `upstream/v5`
- 생성한 v5 설정 파일: `quartz.config.yaml`
- 복원한 로컬 파일: `content/`, `template/`, `tools/`, `AGENTS.md`

반영한 v5 설정:

- `pageTitle: LIS NOTES`
- `locale: ko-KR`
- `baseUrl: lis-blog.pages.dev`
- `defaultDateType: created`
- `tag-list` 활성화
- Giscus `comments` 활성화
- footer GitHub 링크를 `https://github.com/jsut21`로 유지
- `note-properties`는 frontmatter 파싱만 유지하고 패널 UI는 `hidePropertiesView: true`로 숨김
- `cname`, `encrypted-pages`는 v4와 비슷하게 시작하기 위해 비활성화
- `copilot/`은 v5 `.gitignore`에 다시 추가
- `stage:notes`, `stage:notes:apply` scripts 복원
- staging helper는 v5 의존성에 맞춰 `gray-matter` 대신 `yaml`로 frontmatter를 파싱하도록 수정

검증 결과:

- `npm ci` 성공
- `npm run quartz -- plugin install` 성공
- `node --check tools/stage-commit-notes.mjs` 성공
- `npm run stage:notes` 성공
- `npm run quartz -- build` 성공

주의: upstream v5의 `npm run install-plugins` script는 이 환경에서 SCSS import 오류가 났다. Quartz CLI 경로는 정상이라 `install-plugins` script를 `./quartz/bootstrap-cli.mjs plugin install`로 바꿨다.

## 공개 필터 수정

처음 v5 migration 직후에는 `remove-draft`만 켜져 있어서 `draft: true`가 아닌 모든 노트가 로컬 사이트에 보였다. 기존 의도는 명시적으로 선택한 글만 공개하는 것이므로 다음처럼 수정했다.

- `quartz-community/explicit-publish` 활성화
- 기존 공개 대상인 `commit: true` 노트 7개에 `publish: true` 추가
- 새 노트 템플릿에 `publish: false` 추가
- `commit: true`는 계속 Git staging helper 전용으로 유지

따라서 현재 기준은 다음과 같다.

- 사이트 공개: `publish: true`
- 사이트 제외: `publish: true` 없음 또는 `draft: true`
- Git staging: `commit: true`

## 먼저 해야 하는 일

바로 v5로 갈아타기 전에, 현재 블로그가 Quartz 기본 설정에서 바꾼 부분을 먼저 재고로 만들어야 한다.

이유:

- v5는 설정 파일 구조가 바뀐다.
- v4의 `quartz.config.ts`, `quartz.layout.ts`가 v5에서는 `quartz.config.yaml` 중심으로 바뀐다.
- v4의 built-in plugin 상당수가 v5에서는 `quartz-community/*` 플러그인으로 분리된다.
- 현재 블로그의 커스텀 설정을 모르고 migration하면 날짜, 댓글, 태그 표시, footer, 배포 명령이 바뀔 수 있다.

## 현재 블로그의 Quartz v4 커스텀 설정

기준은 upstream Quartz v4 기본 설정이다.

### 사이트 전체 설정

| 항목 | Quartz v4 기본값 | 현재 블로그 값 | v5에서 보존 필요 |
|---|---|---|---|
| `pageTitle` | `Quartz 4` | `LIS NOTES` | 필요 |
| `pageTitleSuffix` | `""` | `""` | 기본값 유지 |
| `enableSPA` | `true` | `true` | 기본값 유지 |
| `enablePopovers` | `true` | `true` | 기본값 유지 |
| `analytics` | `plausible` | `plausible` | 기본값 유지 |
| `locale` | `en-US` | `ko-KR` | 필요 |
| `baseUrl` | `quartz.jzhao.xyz` | `lis-blog.pages.dev` | 필요 |
| `ignorePatterns` | `private`, `templates`, `.obsidian` | 동일 | 기본값 유지 |
| `defaultDateType` | `modified` | `created` | 필요 |
| theme | 기본 theme | 동일 | 기본값 유지 |

가장 중요한 차이는 `defaultDateType: "created"`다.

현재 블로그는 글 목록과 메타데이터에서 수정일보다 생성일을 우선해서 보여주는 방향으로 정리하고 있다. v5로 옮길 때도 `created-modified-date` 플러그인 옵션에서 `defaultDateType: created`를 명시해야 한다.

### Transformer / Filter / Emitter 플러그인

`quartz.config.ts`의 플러그인 구성은 upstream Quartz v4 기본값과 거의 같다.

| v4 플러그인 | 현재 상태 | v5 대응 |
|---|---|---|
| `Plugin.FrontMatter()` | 기본값 | `quartz-community/note-properties` 또는 frontmatter 처리 계열 |
| `Plugin.CreatedModifiedDate()` | 기본값이지만 `defaultDateType`은 site config에서 `created` | `quartz-community/created-modified-date` |
| `Plugin.SyntaxHighlighting()` | 기본값 | `quartz-community/syntax-highlighting` |
| `Plugin.ObsidianFlavoredMarkdown()` | 기본값 | `quartz-community/obsidian-flavored-markdown` |
| `Plugin.GitHubFlavoredMarkdown()` | 기본값 | `quartz-community/github-flavored-markdown` |
| `Plugin.TableOfContents()` | 기본값 | `quartz-community/table-of-contents` |
| `Plugin.CrawlLinks()` | 기본값 | `quartz-community/crawl-links` |
| `Plugin.Description()` | 기본값 | `quartz-community/description` |
| `Plugin.Latex()` | 기본값 | `quartz-community/latex` |
| `Plugin.RemoveDrafts()` | 기본값 | `quartz-community/remove-draft` |
| `Plugin.AliasRedirects()` | 기본값 | `quartz-community/alias-redirects` |
| `Plugin.ContentPage()` | 기본값 | `quartz-community/content-page` |
| `Plugin.FolderPage()` | 기본값 | `quartz-community/folder-page` |
| `Plugin.TagPage()` | 기본값 | `quartz-community/tag-page` |
| `Plugin.ContentIndex()` | 기본값 | `quartz-community/content-index` |
| `Plugin.CustomOgImages()` | 기본값 | `quartz-community/og-image` |

현재 설정은 대부분 기본값이므로, v5 migration의 어려운 부분은 플러그인 옵션 자체보다 설정 파일 형식과 layout mapping이다.

### Layout 커스텀

`quartz.layout.ts`에서 기본값과 다른 부분은 두 가지다.

| 위치 | Quartz v4 기본값 | 현재 블로그 값 | v5에서 보존 필요 |
|---|---|---|---|
| `sharedPageComponents.afterBody` | `[]` | Giscus 댓글 추가 | 필요 |
| `sharedPageComponents.footer.links` | Quartz GitHub + Discord | `GitHub: https://github.com/jsut21` | 필요 |

콘텐츠 페이지 layout은 v4 기본값과 같다.

현재 content page 구성:

```text
beforeBody:
  Breadcrumbs
  ArticleTitle
  ContentMeta
  TagList

left:
  PageTitle
  MobileOnly(Spacer)
  Search + Darkmode + ReaderMode
  Explorer

right:
  Graph
  TableOfContents
  Backlinks
```

중요한 점: v5 기본 설정에서는 `tag-list`가 꺼져 있다. 현재 블로그는 `TagList`를 글 상단에 보여주고 있으므로 v5에서 `tag-list`를 명시적으로 켜야 한다.

### 댓글 설정

현재 Giscus 설정:

```ts
Component.Comments({
  provider: "giscus",
  options: {
    repo: "jsut21/blog",
    repoId: "R_kgDORDL0bw",
    category: "Announcements",
    categoryId: "DIC_kwDORDL0b84C2ApR",
    lang: "ko",
  },
})
```

v5에서는 `quartz-community/comments` 플러그인을 켜고, `layout.position: afterBody`로 배치해야 한다.

### 블로그 운영 workflow 커스텀

Quartz 자체 설정은 아니지만 migration 때 반드시 보존해야 한다.

| 항목 | 현재 값 | 이유 |
|---|---|---|
| `template/frontmatter.md` | `commit: false` 기본값 | 새 노트가 자동 커밋 대상이 되지 않도록 하기 위함 |
| `tools/stage-commit-notes.mjs` | 존재 | `commit: true` 노트와 연결 asset만 stage하기 위한 도구 |
| `package.json` scripts | `stage:notes`, `stage:notes:apply` 추가 | staging workflow 실행용 |
| `AGENTS.md` | 존재 | Codex가 이 vault/blog의 규칙을 따르도록 하는 지침 |

v5로 갈 때 `package.json`이 upstream v5 버전으로 바뀌므로, `stage:notes` 관련 script를 다시 추가해야 한다.

## v5에서 새로 신경 써야 할 점

### 설정 파일 형식 변경

v4:

```text
quartz.config.ts
quartz.layout.ts
```

v5:

```text
quartz.config.yaml
quartz.ts
quartz.lock.json
.quartz/plugins/
```

대부분의 설정은 `quartz.config.yaml`로 옮긴다. TypeScript 수준의 고급 override가 필요할 때만 `quartz.ts`를 쓴다.

### Plugin install 단계

v5는 community plugin을 설치해야 한다.

```bash
npx quartz plugin install --from-config
```

또는 CI/CD에서는 다음 흐름이 필요하다.

```bash
npm ci
npx quartz plugin install
npx quartz build
```

v5 `package.json`에는 `prebuild`로 plugin install을 실행하는 흐름이 들어있지만, 배포 환경에서는 명시적으로 확인하는 편이 안전하다.

### URL 변경

v5는 URL을 lowercase + hyphenated 형태로 만든다.

예:

```text
My Notes/Hello World.md
-> /my-notes/hello-world
```

현재 vault에는 한국어 폴더명과 공백이 있는 파일명이 많다. migration 후 기존 URL이 바뀌는지 반드시 확인해야 한다.

`alias-redirects` 플러그인은 case redirect를 처리하지만, 모든 slug 변경을 사용자가 기대한 방식으로 보존하는지는 별도 확인이 필요하다.

### Note Properties 노출

v5 기본 설정에는 `note-properties`가 켜져 있다.

현재 블로그는 frontmatter에 `commit: true/false`를 운영용 메타데이터로 쓴다. 이 값이 사이트에 보이면 안 된다.

v5 기본값은 `includeAll: false`이고 `description`, `tags`, `aliases`만 표시하므로 기본적으로는 `commit`이 노출되지 않는다. 그래도 migration 후 다음을 확인해야 한다.

```yaml
includedProperties:
  - description
  - tags
  - aliases
```

`includeAll: true`로 바꾸면 `commit`이 노출될 수 있으므로 피한다.

### 새 기능 기본값

v5 기본 설정에는 v4보다 많은 기능이 들어있다.

| 기능 | v5 기본 상태 | 판단 |
|---|---:|---|
| Canvas page | 켜짐 | Obsidian Canvas를 쓸 계획이 있으면 유지 |
| Bases page | 켜짐 | Obsidian Bases를 쓸 계획이 있으면 유지 |
| Unlisted pages | 켜짐 | 공개 목록에서 숨길 글이 필요하면 유지 |
| Encrypted pages | 켜짐 | 비밀번호 보호 글이 필요 없으면 꺼도 됨 |
| Stacked pages | 꺼짐 | 필요할 때만 켜기 |
| Note properties | 켜짐 | `commit` 노출만 주의 |

## v5 마이그레이션 순서

### 1. 현재 작업 상태 정리와 로컬 백업 브랜치

지금 worktree에는 추적/미추적 변경이 많다. 먼저 현재 변경을 로컬 백업 브랜치에 커밋해야 한다.

권장 브랜치:

```text
backup/pre-quartz-v5-20260709
migration/quartz-v5
```

주의할 점: 여기서 "전체 커밋"은 Git이 추적 가능한 non-ignored 파일 전체를 의미한다. `node_modules`, `public`, `.obsidian`, `copilot`, `.quartz-cache`까지 강제로 넣는 `git add -A -f`는 피한다.

현재 ignored 대상:

```text
.obsidian/
copilot/
node_modules/
public/
quartz/.quartz-cache/
```

이 파일들은 로컬 실행 결과물이나 개인 환경 정보에 가깝다. v5 migration에 필요한 백업 대상이 아니다.

확인:

```bash
git status --short
```

노트 커밋 대상 확인:

```bash
npm run stage:notes
```

로컬 백업 브랜치 생성:

```bash
git switch -c backup/pre-quartz-v5-20260709
git add -A
git commit -m "chore: snapshot before quartz v5 migration"
```

이 브랜치는 push하지 않고 로컬 안전장치로 둔다.

### 2. 백업

최소 백업 대상:

```text
content/
quartz.config.ts
quartz.layout.ts
package.json
template/
tools/
AGENTS.md
```

Quartz 공식 문서도 v5 브랜치로 전환하기 전에 `content/`를 repo 밖으로 복사하라고 안내한다.

### 3. v5 브랜치 준비

공식 migration 흐름:

```bash
git remote add upstream https://github.com/jackyzha0/quartz.git
git fetch upstream v5
git checkout -b v5 upstream/v5
npm i
```

현재 repo에는 `origin`만 있으므로 `upstream` remote를 추가해야 한다.

하지만 현재 repo의 v4 변경을 그대로 v5에 merge하는 방식은 피한다. 백업 브랜치에는 v4의 `quartz/`, `quartz.config.ts`, `quartz.layout.ts`, `package.json`도 들어있기 때문이다.

권장 흐름은 v5 브랜치를 upstream v5에서 시작한 뒤, 백업 브랜치에서 필요한 파일만 가져오는 것이다.

```bash
git fetch upstream v5
git switch -c migration/quartz-v5 upstream/v5
git restore --source backup/pre-quartz-v5-20260709 -- content template tools AGENTS.md
```

`package.json`은 통째로 restore하지 않는다. v5의 `package.json`을 유지하고, `stage:notes` 관련 script만 다시 추가한다.

`quartz.config.ts`, `quartz.layout.ts`도 통째로 restore하지 않는다. 이 둘은 v5의 `quartz.config.yaml`로 변환한다.

### 4. Quartz create 실행

Obsidian vault 기반이므로 template은 `obsidian`을 고르는 것이 맞다.

```bash
npx quartz create
```

content strategy는 `Copy`를 선택하고 백업해둔 `content/`를 가져온다.

### 5. v5 config에 현재 커스텀 반영

반드시 반영할 값:

```yaml
configuration:
  pageTitle: LIS NOTES
  pageTitleSuffix: ""
  enableSPA: true
  enablePopovers: true
  analytics:
    provider: plausible
  locale: ko-KR
  baseUrl: lis-blog.pages.dev
  ignorePatterns:
    - private
    - templates
    - .obsidian
```

`created-modified-date`:

```yaml
- source: github:quartz-community/created-modified-date
  enabled: true
  options:
    defaultDateType: created
    priority:
      - frontmatter
      - git
      - filesystem
```

`tag-list`:

```yaml
- source: github:quartz-community/tag-list
  enabled: true
  layout:
    position: beforeBody
    priority: 30
```

`comments`:

```yaml
- source: github:quartz-community/comments
  enabled: true
  options:
    provider: giscus
    options:
      repo: jsut21/blog
      repoId: R_kgDORDL0bw
      category: Announcements
      categoryId: DIC_kwDORDL0b84C2ApR
      lang: ko
  layout:
    position: afterBody
    priority: 10
```

`footer`:

```yaml
- source: github:quartz-community/footer
  enabled: true
  options:
    links:
      GitHub: https://github.com/jsut21
```

### 6. 운영 workflow 복원

v5로 넘어간 뒤 다시 확인할 파일:

```text
template/frontmatter.md
tools/stage-commit-notes.mjs
AGENTS.md
package.json
```

`package.json`에는 다시 추가한다.

```json
{
  "scripts": {
    "stage:notes": "node tools/stage-commit-notes.mjs",
    "stage:notes:apply": "node tools/stage-commit-notes.mjs --stage"
  }
}
```

### 7. 검증

필수 검증:

```bash
npx quartz plugin install --from-config
npm run check
npx quartz build
npx quartz build --serve
```

확인할 화면:

- index 페이지
- 글 상세 페이지
- 태그가 글 상단에 보이는지
- created 날짜가 표시되는지
- 댓글이 보이는지
- Explorer가 한국어 폴더를 제대로 보여주는지
- Graph, Backlinks, Search가 동작하는지
- `commit` frontmatter가 페이지에 노출되지 않는지
- 기존 URL이 redirect되는지

## 결론

현재 블로그는 Quartz v4 기본값에서 많이 벗어나 있지는 않다.

보존해야 할 핵심은 다음이다.

- `pageTitle: LIS NOTES`
- `locale: ko-KR`
- `baseUrl: lis-blog.pages.dev`
- `defaultDateType: created`
- Giscus 댓글
- footer GitHub 링크
- 글 상단 `TagList`
- `commit: true/false` 기반 staging workflow

따라서 migration 난이도는 아주 높지는 않지만, 현재 worktree가 지저분한 상태라 바로 브랜치를 바꾸면 위험하다.

먼저 현재 변경을 커밋하거나 백업한 뒤, `v5` 전용 브랜치에서 migration하는 것이 맞다.

## 참고

- [Quartz v5 GitHub repository](https://github.com/jackyzha0/quartz)
- [Migrating to Quartz 5](https://quartz.jzhao.xyz/getting-started/migrating)
- [Quartz v5 Configuration](https://quartz.jzhao.xyz/configuration)
- [Quartz v5 Feature List](https://quartz.jzhao.xyz/features/)
- [Quartz v5 default config](https://github.com/jackyzha0/quartz/blob/v5/quartz.config.default.yaml)
