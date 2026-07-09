---
title: React Hooks와 Fiber 학습 맵
created: 2026-07-07
draft: false
commit: false
tags:
  - React
  - Frontend
  - 모각코
  - 웹개발
---

# React Hooks와 Fiber 학습 맵

이번 주제의 목표는 React를 "컴포넌트가 다시 실행된다" 수준에서 끝내지 않고, **state update가 어떻게 Hook queue와 Fiber tree를 거쳐 DOM commit으로 이어지는지**까지 연결해서 이해하는 것이다.

## 학습 순서

### 1. 기존 노트 복습

먼저 이미 정리한 노트를 다시 읽는다.

- [[React]]
- [[React 렌더링 시점]]
- [[React가 내부적으로 관리하는 것]]
- [[React Bailout]]

복습할 질문:

- React에서 render는 브라우저 paint와 같은가?
- state는 함수 안에 저장되는가, React 내부에 저장되는가?
- 부모가 렌더링되면 자식은 항상 렌더링되는가?
- bailout은 어느 지점에서 render work를 줄이는가?

### 2. Hooks 이해

다음 노트를 중심으로 공부한다.

- [[React Hooks]]

핵심 질문:

- `useState`는 왜 snapshot처럼 동작하는가?
- `setState`는 값을 즉시 바꾸는가, update를 queue에 넣는가?
- 함수형 업데이트는 왜 연속 업데이트에서 다르게 동작하는가?
- Hook은 왜 항상 같은 순서로 호출되어야 하는가?
- `useEffect`는 render phase에서 실행되는가?

### 3. Fiber 이해

다음 노트를 중심으로 공부한다.

- [[React Fiber 아키텍처]]

핵심 질문:

- React element와 Fiber는 무엇이 다른가?
- current tree와 work-in-progress tree는 왜 나뉘는가?
- render phase가 중단 가능하다는 말은 무엇인가?
- commit phase는 왜 중단되면 안 되는가?
- Fiber의 `memoizedState`와 Hook은 어떻게 연결되는가?

### 4. Hook과 Fiber 연결

둘을 연결해서 다음 흐름을 설명할 수 있어야 한다.

```text
사용자 이벤트
→ setState 호출
→ Hook update queue에 update 추가
→ Fiber root에 work scheduling
→ render phase에서 함수 컴포넌트 재실행
→ Hook linked list를 순서대로 읽음
→ 새 UI 계산
→ commit phase에서 DOM 반영
→ effect 실행
```

## 직접 실험할 코드

### state snapshot

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
    console.log(count)
  }

  return <button onClick={handleClick}>{count}</button>
}
```

확인할 것:

- 버튼을 한 번 누르면 몇이 되는가?
- `console.log(count)`는 무엇을 찍는가?
- 왜 그런가?

### 함수형 업데이트

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount((prev) => prev + 1)
    setCount((prev) => prev + 1)
    setCount((prev) => prev + 1)
  }

  return <button onClick={handleClick}>{count}</button>
}
```

확인할 것:

- 버튼을 한 번 누르면 몇이 되는가?
- 일반 업데이트와 왜 다른가?

### Hook 순서 깨기

```jsx
function BadComponent({ enabled }) {
  if (enabled) {
    const [name, setName] = useState("")
  }

  const [count, setCount] = useState(0)

  return <button>{count}</button>
}
```

확인할 것:

- React가 어떤 경고를 내는가?
- 왜 Hook 순서가 중요하다고 말하는가?

## 정리 목표

아래 문장을 스스로 설명할 수 있으면 이번 주제는 1차 정리 완료다.

> Hook은 함수 컴포넌트 안에서 호출되지만, 상태는 함수 안에 저장되지 않는다. React는 현재 렌더링 중인 Fiber에 Hook linked list를 연결하고, state update를 queue로 관리한다. Fiber는 render work를 작은 단위로 나누어 다음 UI를 계산하고, commit phase에서 실제 DOM에 반영한다.

## 참고

- [React - Render and Commit](https://react.dev/learn/render-and-commit)
- [React - State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React - Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React - Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React source - react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler/src)
