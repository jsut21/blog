---
title: Cornell Note taking method
cornell: true
created: 2026-02-08
tags:
  - note-taking
  - education
commit: true
publish: true
---

## Cornell 노트 방식

Cornell 노트는 본문에 개념과 정보를 기록하고, 그 내용을 다시 생각하게 만드는 질문이나 연관된 생각을 별도의 영역에 남기는 방식이다. ^cornell-purpose

> [!question|cornell-purpose] 왜 본문과 질문을 분리하는가?
> 본문에는 우선 이해해야 하는 직접적인 정보를 둔다.
>
> 질문 영역에는 그 정보에서 생긴 의문과 그에 대한 답변을 함께 기록한다. 나중에 질문만 다시 읽어도 본문의 핵심을 떠올릴 수 있고, 답변을 통해 당시의 이해와 판단도 확인할 수 있다.

이 블로그에서는 오른쪽 본문을 기본적인 지식 흐름으로 사용하고, 연결된 callout을 왼쪽 여백에서 필요할 때 확인하는 형태로 확장한다. ^blog-layout

> [!reflection|blog-layout] 종이 Cornell 양식과 다른 점
> 종이에서는 cue와 본문이 항상 함께 보이지만, 웹에서는 callout 내용이 길어질 수 있다.
>
> 그래서 연결 표시는 항상 남겨 두고, 본문에 마우스를 올리거나 표시를 선택했을 때 전체 callout을 연다. callout이 길어져도 본문 문단 사이의 간격은 달라지지 않는다.

## 구성 요소

노트는 다음 세 가지 영역으로 구성한다. ^cornell-components

1. **본문**: 개념, 사실, 직접적인 설명
2. **연결 callout**: 질문과 답변, 개인적인 생각, 연관 정보
3. **Summary**: 글 전체를 다시 정리한 결론

> [!cue|cornell-components] 확인할 항목
>
> - 본문만 읽어도 전체 내용을 이해할 수 있는가?
> - callout이 어느 본문에 연결되는지 명확한가?
> - 질문뿐 아니라 답변과 생각까지 충분히 기록했는가?

## 작성 형식

본문 블록 끝에 영문 block ID를 지정하고, 바로 다음 callout의 metadata에 같은 ID를 적는다. ^writing-contract

> [!question|writing-contract] block ID를 명시하는 이유는?
> Markdown 원문에서도 callout이 위쪽 본문과 아래쪽 본문 중 어디에 연결되는지 분명하게 만들기 위해서다.
>
> 렌더링할 때도 문서상의 인접 위치를 추측하지 않고 같은 ID를 가진 본문을 정확히 찾을 수 있다.

> [!summary] 정리
> 본문은 독립적으로 계속 흐르고, 연결된 callout은 해당 본문 옆에서 동적으로 열린다.
>
> callout에는 짧은 cue뿐 아니라 질문과 긴 답변, 개인적인 생각, 연관 정보도 기록할 수 있다.
