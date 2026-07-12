---
title: Quartz v5 커스텀 설정
created: 2026-07-10
draft: false
publish: true
commit: false
tags:
  - blog
  - quartz
  - configuration
---

# Quartz v5 커스텀 설정

이 문서는 Quartz v5 기본 설정에서 변경한 항목과 `quartz.ts`, `custom/`, `quartz/styles/custom.scss`에 추가한 로컬 코드를 정리한다.

## YAML 설정 차이

`quartz.config.default.yaml`과 `quartz.config.yaml`의 차이를 기준으로 한다.

| 설정                                 | 현재 값              | 의도                                                               |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------ |
| `pageTitle`                          | `LIS NOTES`          | 사이트 제목                                                        |
| `locale`                             | `ko-KR`              | 한국어 locale                                                      |
| `baseUrl`                            | `lis-blog.pages.dev` | 배포 도메인                                                        |
| `defaultDateType`                    | `created`            | 수정일보다 작성일을 기본 날짜로 표시                               |
| `table-of-contents.maxDepth`         | `5`                  | 깊은 제목까지 목차에 표시                                          |
| `explicit-publish`                   | 활성                 | `publish: true`인 Markdown만 공개                                  |
| `tag-list`                           | 활성                 | 글 상단에 tag 표시                                                 |
| `comments`                           | Giscus 활성          | `jsut21/blog` Discussions를 이용한 댓글                            |
| `note-properties.hidePropertiesView` | `true`               | frontmatter는 파싱하되 본문 properties 패널은 숨김                 |
| `cname`                              | 비활성               | 현재 `pages.dev` 도메인에 CNAME 파일이 필요하지 않음               |
| `encrypted-pages`                    | 비활성               | 원본이 공개 Git 저장소에 있으므로 비밀 보호 수단으로 사용하지 않음 |
| `obsidian-plugin-excalidraw`         | 활성                 | Excalidraw를 인터랙티브 SVG 페이지로 렌더링                        |
| footer links                         | 개인 GitHub          | Quartz 기본 GitHub·Discord 링크 대체                               |

### Ignore 패턴

Quartz 기본 ignore 패턴에 다음 항목을 추가했다.

- `archive`
- `분류 전`
- `claude code 활용`

Canvas, Base, Excalidraw page plugin은 활성화하되, 실제 공개 여부는 `custom/publication-controls.ts`가 별도로 필터링한다.

## `quartz.ts` 런타임 조립

YAML 설정을 로드한 뒤 다음 커스텀을 적용한다.

1. `BlogCustomizations()` transformer를 Obsidian Markdown transformer 앞에 삽입한다.
2. OG image emitter에만 `Noto Sans KR` 폰트를 사용하도록 context를 감싼다.
3. 모든 page type의 footer를 `BlogFooter`로 교체한다.
4. Graph component에 한글 URL slug 디코딩을 적용한다.
5. 변경된 layout으로 `PageTypeDispatcher`를 다시 조립한다.
6. `applyPublicationControls(config)`로 Canvas/Base/Excalidraw 공개 필터를 적용한다.

`PageTypeDispatcher`를 다시 만드는 이유는 YAML에서 생성된 dispatcher가 이미 기존 layout을 참조하고 있기 때문이다.

## Graph 한글 slug 보정

Graph community plugin은 브라우저의 `window.location.pathname`을 현재 문서 slug로 사용한다. 브라우저는 한글 경로를 percent-encoded 값으로 반환하지만 `contentIndex.json`은 디코딩된 한글 slug를 키로 사용하므로, 한글 URL에서는 local graph가 현재 노드와 연결을 찾지 못한다.

`custom/graph-slug-decoding.ts`는 layout에 등록된 Graph component의 런타임 스크립트에 `decodeURI(window.location.pathname)`을 적용한다. 설치된 `.quartz/plugins/graph/`를 직접 수정하지 않으므로 plugin 재설치 후에도 유지된다.

Graph plugin의 스크립트 구조가 upstream에서 바뀌면 빌드 중 명시적인 오류를 발생시켜 보정 로직을 다시 검토하도록 한다.

## 블로그 transformer

`custom/blog-customizations.tsx`는 네 가지 기능을 담는다.

### Google 소유권 확인

모든 페이지 head에 `google-site-verification` meta tag를 추가한다.

### 탐색기 제목 말줄임과 툴팁

`quartz/styles/custom.scss`는 긴 파일명과 폴더명을 한 줄로 제한하고 넘치는 부분을 말줄임표로 표시한다.

`custom/explorer-title-tooltip.ts`는 비동기로 다시 그려지는 탐색기 항목을 감시해 전체 제목을 native tooltip에 동기화한다.

### Cornell 노트 변환

frontmatter의 `cornell` 값으로 연결형과 classic 모드를 선택한다.

- `cornell: true`에는 `cornell`, `cornell: classic`에는 `cornell-classic` CSS class를 추가한다.
- `cue`, `q`, `k`, `keyword`, `term` callout을 `cue`로 표준화한다.
- `question`, `reflection`, `note` 등 의미가 있는 일반 callout type은 유지한다.
- `summary` callout을 Cornell 요약 영역으로 처리한다.
- 연결형에서는 본문 끝의 `^block-id`를 Obsidian transformer보다 먼저 적용해 callout 다음 문단의 ID가 앞 callout에 잘못 붙는 upstream 동작을 보정한다.
- HTML 변환 후에는 요약 callout을 Quartz가 알아볼 수 있는 `summary`로 복원한다.

`custom/cornell-callouts.ts`는 `cornell: true`에서만 같은 block ID를 metadata로 가진 callout을 찾아 hover 미리보기, 클릭 고정, `Esc` 닫기, 좌우 배치와 연결선 위치 계산을 담당한다.

### 한국어 OG image 폰트

일반 테마 타이포그래피는 바꾸지 않고, OG image를 만들 때만 header와 body 폰트를 `Noto Sans KR`로 교체한다. 한글 제목이 소셜 미리보기 이미지에서 깨지는 문제를 방지하기 위한 설정이다.

## 커스텀 footer

`custom/BlogFooter.tsx`와 `custom/blog-footer.scss`를 사용한다.

- 현재 연도를 자동으로 표시한다.
- `LIS Blog`과 개인 GitHub 링크만 표시한다.
- YAML footer와 page type별 footer가 엇갈리지 않도록 `quartz.ts`에서 모두 대체한다.

## Cornell 스타일

`quartz/styles/custom.scss`는 `article.cornell`과 `article.cornell-classic`을 독립적으로 처리한다.

- 본문은 Quartz 기본 너비와 오른쪽 sidebar를 그대로 사용한다.
- 가로 기준선은 낮은 대비로 표시하고 본문 오른쪽 32px rail에 연결 번호를 둔다.
- 활성 문단에는 왼쪽 accent와 옅은 배경을 표시한다.
- callout은 rail 연결선이 있는 단일 sidebar sheet로 열고 내부 카드 테두리는 제거한다.
- 열린 callout은 본문 흐름과 분리되어 길이가 본문 문단 간격에 영향을 주지 않는다.
- 번호를 선택하면 callout을 고정하고 닫기 버튼이나 `Esc`로 닫는다.
- 요약 callout은 상단 accent 선이 있는 전체 너비 footer band로 표시한다.
- `cornell-classic`은 분기 전 170px cue 열, 세로 구분선, card형 summary를 그대로 보존한다.
- 인쇄 시에는 sidebar, backlinks, graph, navigation을 숨긴다.

작성 문법과 Obsidian Reading View 플러그인은 [[Cornell 연결형 Callout]]에 정리한다.

## 비 Markdown 페이지 공개 필터

`custom/publication-controls.ts`는 `content/_publication/`의 Markdown을 읽어 다음을 보장한다.

- 제어 Markdown 자체는 Quartz page로 출력하지 않는다.
- `.canvas`, `.base`, `.excalidraw`, `.excalidraw.md`는 제어 파일이 있고 `publish: true`일 때만 dispatcher에 전달한다.
- `draft: true`는 `publish: true`보다 우선하는 강제 제외 조건이다.
- 하나의 대상에 제어 파일이 여러 개면 빌드를 실패시켜 모호한 공개를 방지한다.

제어 파일의 생성·이름 변경·삭제 동기화는 `[[Publication Manager Sync 플러그인]]`이 담당한다.

## 로컬 운영 스크립트

`package.json`에 Quartz 기본 script 외에 다음 명령을 추가했다.

| 명령                             | 역할                                                   |
| -------------------------------- | ------------------------------------------------------ |
| `npm run stage:notes`            | `commit: true` 문서와 연결 asset staging 목록 미리보기 |
| `npm run stage:notes:apply`      | 선택된 문서와 asset만 staging                          |
| `npm run sync:publication`       | Canvas/Base 제어 파일의 누락·잔존 검사                 |
| `npm run sync:publication:apply` | 누락된 제어 파일 생성                                  |
| `npm run sync:publication:prune` | 대상이 없는 제어 파일 삭제                             |

Obsidian 플러그인이 정상 활성화된 환경에서 `sync:publication:*`은 복구와 CI 검증을 위한 fallback이다.

## 마이그레이션 시 보존할 파일

Quartz upstream을 업데이트할 때는 최소한 다음을 따로 비교한다.

- `quartz.config.yaml`
- `quartz.ts`
- `custom/`
- `quartz/styles/custom.scss`
- `tools/stage-commit-notes.mjs`
- `tools/sync-publication-controls.mjs`
- `package.json` scripts
- `template/frontmatter.md`

## 관련 문서

- [[블로그 운영 구조]]
- [[Publication Manager Sync 플러그인]]
- [[Cornell 연결형 Callout]]
