---
title: Cornell 연결형 Callout
created: 2026-07-12
draft: false
publish: true
commit: false
tags:
  - blog
  - quartz
  - obsidian
  - note-taking
---

## 목적

Cornell 문서의 본문에는 개념, 사실, 직접적인 설명을 기록한다. 본문에서 생긴 질문과 답변, 개인적인 생각, 연관 정보는 callout으로 분리하되 어느 본문에 연결되는지 명시한다.

긴 callout을 본문과 같은 Grid 행에 두면 반대쪽 본문에 큰 여백이 생긴다. 이 구현은 연결된 callout을 본문 흐름에서 분리하고, 대상 본문을 가리킬 때만 주변의 사용 가능한 공간에 팝오버로 표시한다. 평소에는 별도 callout 열을 확보하지 않는다.

## 모드 선택

- `cornell: true`: 본문 오른쪽의 축약 annotation rail과 연결형 팝오버를 사용한다.
- `cornell: classic`: 분기 전의 170px 고정 cue 열과 정적 2열 배치를 사용한다.

classic 모드는 callout metadata를 해석하는 hover 런타임을 실행하지 않는다. cue와 본문의 관계는 Markdown 작성 순서와 고정 열 배치로 표현된다.

## 작성 문법

frontmatter에 `cornell: true`를 설정한다.

```yaml
---
title: Note title
created: 2026-07-12
cornell: true
publish: false
commit: false
---
```

대상 본문 끝에 Obsidian block ID를 적고, callout metadata에 같은 ID를 사용한다.

```md
`publish`는 공개 여부를 결정하고,
`commit`은 Git staging 여부를 결정한다. ^publication-policy

> [!question|publication-policy] 왜 두 상태를 분리하는가?
> 공개 여부와 저장소 반영 여부는 서로 다른 문제이기 때문이다.
>
> 비공개 글도 Git에는 보관할 수 있고, 반대 상황도 있을 수 있다.
```

block ID는 영문, 숫자, 하이픈만 사용한다. 본문과 callout을 원문에서도 함께 찾기 쉽도록 callout은 연결된 본문 바로 다음에 작성한다.

`question` 외에도 `cue`, `reflection`, `note` 등 일반 Obsidian callout type을 사용할 수 있다. `summary`는 연결 metadata 없이 글 마지막의 전체 너비 요약으로 사용한다.

## 블로그 동작

연결된 callout이 있는 본문에는 오른쪽 32px annotation rail에 번호 표시가 추가된다.

- 본문을 약 180ms 동안 가리키면 callout을 미리 본다.
- 포인터를 callout 안으로 옮겨도 닫히지 않는다.
- 활성 문단은 옅은 배경과 왼쪽 accent 선으로 구분한다.
- 열린 callout은 rail과 연결선으로 이어진 단일 sidebar sheet에 표시한다.
- 번호를 선택하면 callout이 고정된다.
- 닫기 버튼이나 `Esc`로 닫는다.
- 한 시점에는 한 본문의 callout만 펼친다.
- 긴 callout은 패널 내부에서 스크롤한다.
- 패널은 본문 오른쪽을 우선하고, 공간이 부족하면 왼쪽 또는 본문 위에 겹쳐 표시한다.
- callout이 길어져도 본문 문단 간격은 바뀌지 않는다.

ID가 없거나 대상 본문을 찾지 못한 callout은 일반 문서 흐름에 그대로 남는다.

## Obsidian Reading View

로컬 `Cornell Anchored Callouts` 플러그인이 블로그와 같은 연결형·classic 모드를 처리한다.

```text
.obsidian/plugins/cornell-anchored-callouts/
|-- main.js
|-- manifest.json
|-- styles.css
```

`cornell: true`에서는 `registerMarkdownPostProcessor()`로 연결 대상과 callout을 찾아 원본 callout을 숨기고 복제본을 고정 팝오버로 표시한다. `cornell: classic`에서는 연결 런타임을 끄고 기존 cue 열 스타일만 적용한다.

`.obsidian/`은 Git ignore 대상이므로 플러그인 자체는 로컬 Vault에만 있다. 파일을 수정한 뒤에는 Obsidian을 재시작하거나 커뮤니티 플러그인 설정에서 껐다가 다시 켠다.

## 구현 파일

- `custom/blog-customizations.tsx`: Cornell class, callout 정규화, block ID 선처리
- `custom/cornell-callouts.ts`: 브라우저 상호작용과 패널 위치 계산
- `custom/cornell-callouts.test.ts`: metadata와 배치 회귀 테스트
- `quartz/styles/custom.scss`: 블로그 Cornell 레이아웃
- `.obsidian/plugins/cornell-anchored-callouts/`: Obsidian Reading View 플러그인

## 관련 문서

- [[Quartz v5 커스텀 설정]]
- [[블로그 운영 구조]]
