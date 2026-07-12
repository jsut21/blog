---
title: Publication Manager Sync 플러그인
created: 2026-07-10
draft: false
publish: true
commit: false
tags:
  - blog
  - obsidian
  - plugin
  - publication
---

# Publication Manager Sync 플러그인

`Publication Manager Sync`는 Canvas, Base, Excalidraw에 동일한 공개·커밋 정책을 적용하기 위한 로컬 Obsidian 플러그인이다.

플러그인은 관리 대상 파일과 1:1로 대응하는 Markdown 제어 파일을 `content/_publication/`에 유지한다. `PUBLICATION-MANAGER.base`는 이 제어 파일을 검색해 `publish`, `commit`을 편집할 수 있는 행으로 표시한다.

## 설치 위치

```text
.obsidian/plugins/publication-manager-sync/
├── main.js
├── manifest.json
├── package.json
└── README.md
```

`설정 > 커뮤니티 플러그인 > Publication Manager Sync`에서 활성화한다.

`.obsidian/`은 Git ignore 대상이므로 이 플러그인은 현재 로컬 Vault에만 존재한다. Git clone으로 다른 컴퓨터에 옮길 때는 플러그인 디렉터리를 별도로 백업해야 한다.

## 핵심 구조

```text
Obsidian Vault 파일 이벤트
             ↓
Publication Manager Sync
             ↓
content/_publication/*.md
             ↓
PUBLICATION-MANAGER.base
             ↓
Quartz 공개 필터 / Git staging helper
```

Base 파일에 행 목록을 직접 기록하는 방식이 아니다. 플러그인이 제어 Markdown의 생명주기를 관리하고, Obsidian Bases가 Vault metadata를 다시 인덱싱해 행을 동적으로 표시한다.

## 관리 대상

다음 조건을 모두 만족하는 파일만 관리한다.

- `content/` 아래에 있다.
- 확장자가 `.canvas`, `.base`, `.excalidraw` 또는 `.excalidraw.md`다.
- 제외 폴더에 있지 않다.

제외 폴더:

- `content/_publication/`
- `content/archive/`
- `content/분류 전/`
- `content/claude code 활용/`

루트의 `PUBLICATION-MANAGER.base`는 `content/` 밖에 있으므로 자신의 제어 파일을 만들지 않는다. `content/PUBLISHED-NOTES.base`와 `content/` 아래의 Excalidraw는 공개 가능한 콘텐츠이므로 제어 파일을 가진다.

## 제어 파일

예를 들어 `content/diagrams/system.canvas`에 대해 다음과 같은 제어 파일을 만든다.

```yaml
---
title: system
created: 2026-07-10
publication_control: true
content_type: canvas
target: "[[content/diagrams/system.canvas]]"
publish: false
commit: false
---
```

- `publication_control`: 일반 Markdown과 제어 파일을 구분한다.
- `content_type`: `canvas`, `base` 또는 `excalidraw`다.
- `target`: 실제 파일을 가리키는 Obsidian 링크다.
- `publish`: Quartz 출력 여부다.
- `commit`: staging helper 선택 여부다.

처음 만들어진 제어 파일은 항상 `publish: false`, `commit: false`로 시작한다.

## 파일 이벤트

Obsidian은 Vault에서 파일 변화를 인식하면 플러그인 API로 이벤트를 전달한다. 이 플러그인은 `create`, `rename`, `delete`를 구독한다.

| 변화                  | 처리                                                   |
| --------------------- | ------------------------------------------------------ |
| 관리 대상 파일 생성   | 누락된 제어 Markdown을 생성                            |
| 이름 변경             | `title`, `target`, `content_type`과 제어 파일명을 갱신 |
| 관리 폴더 안에서 이동 | 변경된 경로로 `target`과 제어 파일명을 갱신            |
| 제외 폴더로 이동      | 제어 Markdown을 Obsidian 휴지통으로 이동               |
| 파일 삭제             | 제어 Markdown을 Obsidian 휴지통으로 이동               |

이름이나 경로를 바꾸어도 기존 `publish`, `commit`, `created`는 유지한다.

`modify` 이벤트는 구독하지 않는다. 관리 대상 파일의 내용만 바뀌는 것은 공개·커밋 상태를 변경할 이유가 없기 때문이다.

## 시작 동기화

파일 이벤트만으로는 다음 경우를 완전히 처리할 수 없다.

- Obsidian이 꺼진 동안 파일을 변경한 경우
- 운영체제나 외부 에디터의 저장 방식으로 이벤트를 놓친 경우
- 플러그인을 처음 설치한 경우

그래서 Obsidian layout이 준비된 후 `reconcile()`을 실행한다.

1. 모든 관리 대상 Canvas/Base/Excalidraw를 수집한다.
2. 모든 제어 Markdown의 `target`을 읽는다.
3. 누락된 제어 파일을 만든다.
4. 이름과 경로가 틀린 제어 파일을 갱신한다.
5. 대상이 없는 제어 파일을 휴지통으로 이동한다.

이벤트 처리는 Promise queue에 순서대로 넣어 빠른 연속 변경이 같은 제어 파일을 동시에 수정하지 않도록 한다.

## Publication Manager에서 편집

`PUBLICATION-MANAGER.base`의 `Content Manager` view는 두 종류의 Markdown을 같이 보여준다.

- 일반 Markdown: 원본 문서의 properties를 편집한다.
- Canvas/Base/Excalidraw 제어 Markdown: 제어 문서의 properties를 편집한다.

`Content` formula는 일반 Markdown에 대해서는 자신의 링크를, 제어 Markdown에 대해서는 `target` 링크를 표시한다. 사용자에게는 원본을 직접 관리하는 것처럼 보이지만, 실제 체크박스 변경은 제어 Markdown frontmatter에 저장된다.

## Quartz와 Git의 사용

- Quartz는 `publish: true` 제어가 있는 Canvas/Base/Excalidraw만 빌드 대상으로 넘긴다.
- staging helper는 `commit: true` 제어 파일을 발견하면 제어 Markdown과 `target` 파일을 함께 staging한다.
- `commit: false`로 바꾸는 것은 향후 staging 대상에서만 제외한다. 이미 Git에 올라간 파일은 삭제하지 않는다.

로컬 증분 빌드는 다음 명령으로 실행한다.

```bash
npm run quartz -- build --serve
```

`publish`를 켜면 대상 페이지를 증분 생성하고, 끄면 이전에 생성된 HTML을 삭제한 뒤 브라우저를 새로고침한다. `commit` 변경도 파일 저장 이벤트를 일으키지만 공개 상태를 바꾸지 않으므로 사이트 화면에는 변화가 없는 것이 정상이다.

## 수동 명령과 복구

플러그인 시작 동기화와 같은 역할을 하는 CLI fallback이 있다.

```bash
npm run sync:publication
npm run sync:publication:apply
npm run sync:publication:prune
```

- 첫 번째 명령은 누락·잔존 상태만 읽어서 보고한다.
- `apply`는 누락된 제어 파일을 생성한다.
- `prune`은 대상이 없는 제어 파일을 삭제한다.

플러그인에는 명령 팔레트에서 실행할 수 있는 두 명령도 있다.

- `Publication Manager Sync: Sync publication controls now`
- `Publication Manager Sync: Open publication manager`

## 검증

제어 파일 상태:

```bash
npm run sync:publication
```

플러그인 JavaScript 문법:

```bash
node --check .obsidian/plugins/publication-manager-sync/main.js
```

Quartz 공개 필터:

```bash
node --check tools/sync-publication-controls.mjs
npx tsc --noEmit
npx quartz build
```

## 제한과 주의점

- 플러그인이 꺼져 있으면 실시간 동기화는 동작하지 않는다.
- 플러그인을 다시 켜거나 Obsidian을 다시 열면 시작 동기화가 현재 상태를 복구한다.
- `content/` 밖의 관리 대상 파일은 처리하지 않는다.
- `npm run sync:publication:prune`은 제어 Markdown을 직접 삭제하므로 먼저 기본 검사 명령의 결과를 확인한다.

## 관련 문서

- [[블로그 운영 구조]]
- [[Quartz v5 커스텀 설정]]
