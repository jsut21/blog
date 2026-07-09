---
title: React Fiber 아키텍처
created: 2026-07-07
draft: false
commit: false
tags:
  - React
  - Frontend
  - 모각코
  - 웹개발
---

# React Fiber 아키텍처

Fiber는 React의 reconciliation 엔진을 구성하는 내부 아키텍처다. React 16부터 도입되었고, UI 업데이트 작업을 작은 단위로 쪼개고 우선순위를 부여할 수 있게 만든 기반이다.

사용자가 직접 Fiber를 다루지는 않지만, 렌더링, Hook, bailout, concurrent rendering을 이해하려면 Fiber 모델을 알아야 한다.

## 먼저 잡을 핵심 질문

- React element와 Fiber node는 무엇이 다른가?
- 왜 React는 render phase와 commit phase를 나누는가?
- current tree와 work-in-progress tree는 무엇인가?
- Fiber가 어떻게 작업을 중단, 재개, 폐기할 수 있게 만드는가?
- [[React Hooks]]의 state는 Fiber 어디에 연결되는가?

## React element와 Fiber의 차이

React element는 JSX가 변환되어 만들어지는 불변 객체다.

```jsx
const element = <button className="primary">Save</button>
```

이 element는 "UI가 어떻게 생겨야 하는지"를 설명한다.

Fiber는 React가 이 element를 실제 렌더링 작업으로 처리하기 위해 만든 내부 작업 단위다.

| 구분 | React element | Fiber |
|---|---|---|
| 성격 | UI 설명 객체 | React 내부 작업 단위 |
| 변경 가능성 | 불변에 가까움 | 작업 중 갱신되는 mutable node |
| 역할 | 무엇을 그릴지 표현 | 언제, 어떻게 처리할지 관리 |
| 사용 주체 | 개발자가 JSX로 간접 생성 | React reconciler 내부 |

## Fiber는 트리이면서 linked structure다

Fiber node는 부모/자식/형제 관계를 포인터로 가진다.

```text
return  -> parent
child   -> first child
sibling -> next sibling
```

이 구조 덕분에 React는 재귀 호출만으로 전체 트리를 한 번에 처리하지 않고, 작업 단위를 순회하면서 중간에 멈추거나 다시 시작할 수 있다.

## current tree와 work-in-progress tree

React는 화면에 이미 반영된 tree와 다음 화면을 계산 중인 tree를 구분한다.

```text
current tree
= 현재 화면에 commit된 Fiber tree

work-in-progress tree
= 다음 UI를 계산하기 위해 render phase에서 만드는 Fiber tree
```

각 Fiber는 `alternate`를 통해 반대편 tree의 대응 Fiber와 연결될 수 있다.

```text
current fiber <-> work-in-progress fiber
```

render phase에서는 work-in-progress tree를 만들고, commit phase에서 이 결과를 실제 DOM에 반영한다.

## Render phase

render phase는 다음 UI를 계산하는 단계다.

기존 노트 [[React 렌더링 시점]]과 연결하면:

```text
trigger
→ render phase
→ commit phase
```

render phase에서 React는:

- 컴포넌트 함수를 호출한다.
- 새로운 React element tree를 얻는다.
- 이전 Fiber tree와 비교한다.
- 어떤 DOM 변경이 필요한지 계산한다.
- 각 Fiber에 flags를 표시한다.

중요한 점:

- render phase는 순수해야 한다.
- DOM을 직접 바꾸지 않는다.
- concurrent rendering에서는 중단되거나 다시 실행될 수 있다.
- 작업 결과가 버려질 수도 있다.

## Commit phase

commit phase는 render phase에서 계산한 변경 사항을 실제 host environment에 반영하는 단계다. 브라우저에서는 DOM mutation이 일어난다.

commit phase의 특징:

- 중단되지 않는다.
- 실제 DOM 변경이 일어난다.
- layout effect가 실행된다.
- 이후 passive effect가 실행될 수 있다.

즉 Fiber가 작업을 쪼개고 우선순위를 조절할 수 있는 주된 구간은 render phase다. commit phase는 화면 일관성을 위해 동기적으로 끝까지 진행된다.

## Fiber node가 들고 있는 중요한 정보

정확한 필드는 React 버전에 따라 바뀔 수 있지만, 개념적으로 Fiber는 다음 정보를 가진다.

| 정보 | 의미 |
|---|---|
| `type` | 컴포넌트 함수, host tag 등 |
| `key` | list reconciliation에 쓰는 key |
| `return` | 부모 Fiber |
| `child` | 첫 번째 자식 Fiber |
| `sibling` | 다음 형제 Fiber |
| `pendingProps` | 이번 render에서 사용할 props |
| `memoizedProps` | 이전에 확정된 props |
| `memoizedState` | state, Hook linked list 등 |
| `updateQueue` | pending update/effect 등 |
| `lanes` | 이 Fiber에 걸린 update priority |
| `flags` | commit phase에서 처리할 effect marker |
| `alternate` | current/WIP 대응 Fiber |

## Lanes와 우선순위

React는 모든 업데이트를 같은 우선순위로 처리하지 않는다.

예:

- 입력 중인 텍스트 업데이트는 빠르게 반응해야 한다.
- 화면 밖 데이터 준비나 transition은 늦게 처리되어도 된다.

Fiber 아키텍처는 이런 update priority를 관리하기 위한 기반이고, 현대 React에서는 lane 모델이 그 역할을 한다.

개념적으로:

```text
setState
→ update에 lane 부여
→ root에 work scheduling
→ render phase에서 해당 lane의 work 수행
→ commit
```

## Bailout과 Fiber

[[React Bailout]]은 Fiber 단위 최적화로 볼 수 있다.

React가 어떤 Fiber를 처리할 때 다음 조건들이 충족되면 하위 트리 작업을 건너뛸 수 있다.

- props가 바뀌지 않았다.
- state update가 없다.
- context 변화가 없다.
- 처리해야 할 lane이 없다.

이때 Fiber는 이전 결과를 재사용하고 하위 render work를 줄인다.

## Hook과 Fiber

Hook state는 함수 컴포넌트 Fiber에 연결된다.

React source의 핵심 구조를 개념화하면:

```text
Fiber.memoizedState
→ Hook
→ Hook
→ Hook
```

각 Hook은 대략 다음 정보를 가진다.

- `memoizedState`: 현재 Hook 값
- `baseState`: update 계산의 기준 state
- `queue`: pending updates
- `next`: 다음 Hook

그래서 Hook 호출 순서가 바뀌면 Fiber의 Hook linked list와 컴포넌트 코드가 어긋난다.

## Fiber를 공부할 때 주의할 점

Fiber는 public API가 아니다. React 내부 구현이므로 버전에 따라 세부 필드와 함수 이름이 바뀔 수 있다.

따라서 공부할 때는 다음 두 층을 구분해야 한다.

```text
안정적인 개념
- render phase / commit phase
- current tree / work-in-progress tree
- Fiber as work unit
- Hook state is attached to Fiber
- bailout skips work

변할 수 있는 구현 세부
- 정확한 field 이름
- lane bitmask 구현
- 내부 함수명
- flags 세부 값
```

## 관련 노트

- [[React]]
- [[React 렌더링 시점]]
- [[React Bailout]]
- [[React Hooks]]
- [[React가 내부적으로 관리하는 것]]

## 참고

- [React - Render and Commit](https://react.dev/learn/render-and-commit)
- [React source - react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler/src)
- [React source - ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [React source - ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [React v16.0 release blog](https://legacy.reactjs.org/blog/2017/09/26/react-v16.0.html)
