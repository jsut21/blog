---
title: React Hooks
created: 2026-07-07
draft: false
commit: false
tags:
  - React
  - Frontend
  - 모각코
  - 웹개발
---

# React Hooks

React Hook은 함수 컴포넌트에서 React의 기능을 사용할 수 있게 해주는 API다.

React에는 기본으로 제공되는 Hook들이 있고, 개발자는 이 Hook들을 조합해서 custom Hook을 만들 수 있다.

## 먼저 잡을 큰 그림

- Built-in Hook: React가 제공하는 기본 Hook이다. 예를 들어 `useState`, `useEffect`, `useRef`가 있다.
- Custom Hook: built-in Hook을 조합해서 특정 로직을 재사용 가능한 함수로 뽑아낸 것이다.
- Hook은 평범한 함수처럼 호출하지만, React의 렌더링 시스템과 연결된다.
- Hook은 호출 순서가 중요하기 때문에 아무 위치에서나 호출할 수 없다.

## Built-in Hooks 전체 목록

React 19.2 공식 문서 기준으로 `react` 패키지에서 제공하는 built-in Hook은 다음과 같다.

| 분류 | Hook | 핵심 용도 |
|---|---|---|
| State | `useState` | 컴포넌트의 지역 상태를 저장한다. |
| State | `useReducer` | 복잡한 상태 변경 로직을 reducer로 관리한다. |
| Context | `useContext` | Context 값을 읽는다. |
| Ref | `useRef` | 렌더링을 일으키지 않는 mutable 값을 보관하거나 DOM 노드를 참조한다. |
| Ref | `useImperativeHandle` | 부모에게 노출되는 ref 값을 직접 정의한다. |
| Effect | `useEffect` | 외부 시스템과 동기화하는 부수효과를 실행한다. |
| Effect | `useLayoutEffect` | DOM 반영 후, 브라우저 paint 전에 동기적으로 실행한다. |
| Effect | `useInsertionEffect` | CSS-in-JS 라이브러리처럼 스타일 삽입 타이밍이 중요한 경우 사용한다. |
| Effect | `useEffectEvent` | Effect 안에서 reactive하지 않은 로직을 분리한다. |
| Performance | `useMemo` | 계산 결과를 캐싱한다. |
| Performance | `useCallback` | 함수 identity를 캐싱한다. |
| Performance | `useTransition` | 일부 상태 업데이트를 긴급하지 않은 transition으로 표시한다. |
| Performance | `useDeferredValue` | 값의 업데이트 반영을 지연시킨다. |
| Other | `useDebugValue` | custom Hook의 디버그 표시 값을 React DevTools에 제공한다. |
| Other | `useId` | 접근성 속성 등에 쓸 안정적인 고유 ID를 만든다. |
| Other | `useSyncExternalStore` | React 바깥의 external store를 구독한다. |
| Other | `useActionState` | form action 같은 action 결과 상태를 관리한다. |

`react-dom`에는 form 상태를 읽는 `useFormStatus`도 있다. 이것은 `react`가 아니라 `react-dom`에서 제공된다.

또한 React 19에는 `use` API도 있지만, 공식 문서에서는 Hook 목록이 아니라 React API로 분류한다. 일반 Hook과 호출 규칙이 일부 다르므로 별도로 보는 편이 좋다.

## State Hooks

State Hook은 컴포넌트가 렌더링 사이에 값을 기억하도록 만든다.

### useState

`useState`는 가장 기본적인 상태 Hook이다.

```jsx
const [count, setCount] = useState(0)
```

`count`는 현재 렌더링의 state snapshot이고, `setCount`는 다음 렌더링을 예약한다. `setCount`를 호출한다고 지금 실행 중인 함수 안의 `count` 값이 즉시 바뀌는 것은 아니다.

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
  }

  return <button onClick={handleClick}>{count}</button>
}
```

같은 이벤트 핸들러 안의 `count`는 같은 렌더링에서 만들어진 값이다. 이전 업데이트 결과를 이어서 계산해야 하면 함수형 업데이트를 쓴다.

```jsx
setCount((prev) => prev + 1)
setCount((prev) => prev + 1)
setCount((prev) => prev + 1)
```

### useReducer

`useReducer`는 상태 변경 규칙을 reducer 함수로 모은다.

```jsx
function reducer(state, action) {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1 }
    case "reset":
      return { count: 0 }
    default:
      return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 })

  return (
    <button onClick={() => dispatch({ type: "increment" })}>
      {state.count}
    </button>
  )
}
```

단순한 값 하나는 `useState`가 편하고, 상태 변경 규칙이 여러 action으로 늘어나면 `useReducer`가 읽기 쉽다.

## Context Hook

### useContext

`useContext`는 Context 값을 읽는다.

```jsx
const theme = useContext(ThemeContext)
```

Context는 여러 컴포넌트가 공통으로 필요한 값을 prop drilling 없이 전달할 때 쓴다. Context 값이 바뀌면 그 값을 읽는 컴포넌트들도 다시 렌더링될 수 있다.

Context는 전역 상태 저장소라기보다, React 트리 안에서 값을 공급하고 읽는 통로에 가깝다.

## Ref Hooks

Ref Hook은 렌더링을 일으키지 않는 값을 다룰 때 쓴다.

### useRef

`useRef`는 `.current`에 mutable 값을 저장한다.

```jsx
const inputRef = useRef(null)
```

대표적인 용도는 두 가지다.

- DOM 노드를 참조한다.
- 렌더링과 무관한 값을 보관한다.

`ref.current`를 바꿔도 렌더링이 다시 일어나지 않는다. 화면에 보여야 하는 값은 ref가 아니라 state에 저장해야 한다.

### useImperativeHandle

`useImperativeHandle`은 부모가 ref로 접근할 수 있는 값을 직접 정한다.

```jsx
useImperativeHandle(ref, () => ({
  focus() {
    inputRef.current?.focus()
  },
}))
```

일반적인 컴포넌트 설계에서는 자주 쓰지 않는다. 그래도 입력창 focus, 스크롤 제어처럼 명령형 API를 제한적으로 노출해야 할 때 필요할 수 있다.

## Effect Hooks

Effect Hook은 React 바깥의 시스템과 컴포넌트를 동기화할 때 쓴다.

여기서 외부 시스템은 DOM API, 네트워크, 타이머, 브라우저 이벤트, 외부 라이브러리, WebSocket 같은 것을 말한다.

### useEffect

`useEffect`는 렌더링 결과가 DOM에 반영된 뒤 실행된다.

```jsx
useEffect(() => {
  const id = setInterval(() => {
    console.log("tick")
  }, 1000)

  return () => clearInterval(id)
}, [])
```

`useEffect`를 "상태 계산용 도구"로 생각하면 코드가 복잡해지기 쉽다. props나 state에서 바로 계산할 수 있는 값은 렌더링 중에 계산하고, 외부 시스템과 동기화해야 할 때 effect를 쓴다.

흐름은 대략 다음과 같다.

```text
state update
-> render phase: 컴포넌트 호출, 다음 UI 계산
-> commit phase: DOM 반영
-> passive effect: useEffect 실행
```

### useLayoutEffect

`useLayoutEffect`는 DOM이 반영된 뒤, 브라우저가 화면을 그리기 전에 동기적으로 실행된다.

레이아웃 측정이나 paint 전에 DOM 상태를 맞춰야 하는 경우에 쓴다. 대부분의 effect는 `useEffect`로 충분하고, 화면 깜빡임이나 레이아웃 측정 문제가 있을 때 `useLayoutEffect`를 고려한다.

### useInsertionEffect

`useInsertionEffect`는 DOM mutation 전에 스타일을 삽입해야 하는 CSS-in-JS 라이브러리 쪽 용도에 가깝다.

애플리케이션 코드에서 직접 쓸 일은 드물다.

### useEffectEvent

`useEffectEvent`는 Effect 안에서 reactive하지 않아야 하는 로직을 분리할 때 쓴다.

Effect는 의존성 배열에 들어간 값이 바뀌면 다시 실행된다. 그런데 Effect 안에서 최신 props나 state를 읽고 싶지만, 그 값 때문에 Effect를 다시 실행하고 싶지는 않은 경우가 있다. 이때 `useEffectEvent`가 사용된다.

## Performance Hooks

Performance Hook은 렌더링 성능을 조정할 때 쓴다. 처음부터 습관적으로 넣기보다는 실제로 identity 변화나 비싼 계산이 문제가 될 때 사용하는 편이 좋다.

### useMemo

`useMemo`는 계산 결과를 캐싱한다.

```jsx
const visibleItems = useMemo(() => {
  return items.filter((item) => item.visible)
}, [items])
```

### useCallback

`useCallback`은 함수 identity를 캐싱한다.

```jsx
const handleSelect = useCallback((id) => {
  setSelectedId(id)
}, [])
```

`useCallback(fn, deps)`는 개념적으로 `useMemo(() => fn, deps)`와 비슷하다.

### useTransition

`useTransition`은 일부 상태 업데이트를 긴급하지 않은 작업으로 표시한다.

```jsx
const [isPending, startTransition] = useTransition()

function handleChange(value) {
  setInputValue(value)
  startTransition(() => {
    setSearchQuery(value)
  })
}
```

입력 값 반영처럼 즉시 보여야 하는 업데이트와, 검색 결과 갱신처럼 조금 늦어도 되는 업데이트를 분리할 때 유용하다.

### useDeferredValue

`useDeferredValue`는 어떤 값의 반영을 늦춘 버전을 만든다.

```jsx
const deferredQuery = useDeferredValue(query)
```

검색어 입력은 즉시 반영하되, 무거운 결과 목록은 지연된 값으로 렌더링하는 식으로 사용할 수 있다.

## Other Hooks

### useId

`useId`는 접근성 속성에 연결할 안정적인 ID를 만든다.

```jsx
const id = useId()

return (
  <>
    <label htmlFor={id}>Name</label>
    <input id={id} />
  </>
)
```

### useDebugValue

`useDebugValue`는 custom Hook의 내부 상태를 React DevTools에 표시할 때 쓴다.

```jsx
function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot)
  useDebugValue(isOnline ? "Online" : "Offline")
  return isOnline
}
```

### useSyncExternalStore

`useSyncExternalStore`는 React 바깥의 store를 React와 안전하게 연결한다.

Redux 같은 라이브러리, 브라우저 API, 직접 만든 external store를 구독할 때 쓸 수 있다. 일반 애플리케이션 코드보다는 상태 관리 라이브러리나 공통 유틸리티에서 더 자주 보게 된다.

### useActionState

`useActionState`는 action이 실행된 뒤의 상태를 관리한다.

form action이나 서버 액션 흐름에서 이전 action 결과, pending 상태, 다음 상태를 다룰 때 사용된다.

### useFormStatus

`useFormStatus`는 `react-dom`에서 제공하는 Hook이다.

가까운 부모 form의 제출 상태를 읽을 수 있다. 예를 들어 submit 버튼에서 현재 form이 pending 상태인지 확인할 때 쓴다.

## Custom Hook

Custom Hook은 React의 기능을 새로 만드는 것이 아니다. built-in Hook들을 조합해서 반복되는 로직을 함수로 뽑아낸 것이다.

이름은 반드시 `use`로 시작해야 한다.

```jsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
```

사용하는 쪽은 일반 Hook처럼 호출한다.

```jsx
function StatusBadge() {
  const isOnline = useOnlineStatus()

  return <span>{isOnline ? "Online" : "Offline"}</span>
}
```

중요한 점:

- custom Hook은 built-in Hook이나 다른 custom Hook을 호출할 수 있다.
- custom Hook도 Hook 규칙을 지켜야 한다.
- 같은 custom Hook을 여러 컴포넌트에서 호출해도 state가 공유되는 것은 아니다.
- state를 공유하려면 Context, external store, 상위 컴포넌트 state 같은 별도의 공유 지점이 필요하다.

예시로 만들 수 있는 custom Hook:

- `useOnlineStatus`: 브라우저 온라인 상태 구독
- `useLocalStorage`: localStorage와 state 동기화
- `useDebouncedValue`: 입력 값을 일정 시간 지연
- `useWindowSize`: window resize 이벤트 구독
- `useFetch`: 요청 상태 관리

`useFetch` 같은 Hook은 편리하지만, 캐싱, 중복 요청 제거, refetch, 에러 정책이 필요해지면 TanStack Query 같은 전용 라이브러리를 쓰는 편이 나을 수 있다.

## Rules of Hooks

Hook은 아무 곳에서나 호출할 수 없다.

지켜야 할 규칙:

- React 함수 컴포넌트의 최상위에서 호출한다.
- custom Hook의 최상위에서 호출한다.
- 조건문 안에서 호출하지 않는다.
- 반복문 안에서 호출하지 않는다.
- 중첩 함수 안에서 호출하지 않는다.
- 이벤트 핸들러 안에서 호출하지 않는다.
- `try/catch/finally` 안에서 호출하지 않는다.
- `useMemo`, `useReducer`, `useEffect` 등에 넘기는 함수 안에서 새 Hook을 호출하지 않는다.

잘못된 예:

```jsx
function Component({ enabled }) {
  if (enabled) {
    const [value, setValue] = useState("")
  }

  const [count, setCount] = useState(0)
}
```

이 코드는 `enabled` 값에 따라 Hook 호출 개수가 달라진다.

React는 Hook을 이름으로 찾는 것이 아니라 렌더링 중 호출되는 순서로 연결한다. 그래서 매 렌더링마다 Hook 호출 순서가 같아야 한다.

## 내부 모델

함수 컴포넌트는 렌더링될 때마다 다시 실행된다. 함수의 지역 변수는 실행이 끝나면 사라진다.

그런데 state는 사라지지 않는다. React가 컴포넌트의 Fiber에 Hook 상태를 저장하기 때문이다.

개념적으로 보면 다음과 같다.

```text
Function Component Fiber
└─ memoizedState
   ├─ Hook(useState)
   ├─ Hook(useEffect)
   └─ Hook(useMemo)
```

함수 컴포넌트가 렌더링될 때 React는 현재 작업 중인 Fiber를 기준으로 Hook 목록을 순서대로 읽고 갱신한다.

따라서 Hook은 "함수 안에 상태를 저장하는 문법"이 아니라, Fiber reconciler가 함수 컴포넌트에 state, ref, effect 같은 React 기능을 붙이는 방식이다.

이 내부 구조는 [[React Fiber 아키텍처]]를 공부할 때 다시 연결해서 보면 좋다.

## 우선순위 있게 공부하기

먼저 봐야 하는 Hook:

- `useState`
- `useEffect`
- `useRef`
- `useMemo`
- `useCallback`
- `useContext`
- custom Hook

그 다음 보면 좋은 Hook:

- `useReducer`
- `useLayoutEffect`
- `useTransition`
- `useDeferredValue`
- `useId`

나중에 필요할 때 보면 되는 Hook:

- `useImperativeHandle`
- `useInsertionEffect`
- `useDebugValue`
- `useSyncExternalStore`
- `useActionState`
- `useEffectEvent`
- `useFormStatus`

## 관련 노트

- [[React]]
- [[React 렌더링 시점]]
- [[React가 내부적으로 관리하는 것]]
- [[React Bailout]]
- [[React Fiber 아키텍처]]

## 참고

- [React Reference Overview](https://react.dev/reference/react)
- [React - Built-in React Hooks](https://react.dev/reference/react/hooks)
- [React - Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React - Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
