---
tags:
  - React
  - Frontend
  - 모각코
  - 웹개발
created: 2026-07-01
---

# React (리액트)

React는 Facebook에서 개발하고 유지하는 오픈 소스 JavaScript 라이브러리로, 사용자 인터페이스(UI)를 구축하기 위한 선언적이고 효율적이며 유연한 JavaScript 라이브러리다. 주로 Single Page Application(SPA)을 개발할 때 사용된다.

## 1. 핵심 개념 (Core Concepts)

- **컴포넌트 기반 (Component-Based)**
  - UI를 독립적이고 재사용 가능한 최소 단위인 '컴포넌트(Component)'로 나누어 개발한다.
  - 컴포넌트는 레고 블록처럼 조립하여 복잡한 UI를 구성할 수 있게 해준다.

- **선언적 뷰 (Declarative)**
  - React는 상호작용이 많은 UI를 만들 때 생기는 어려움을 줄여준다.
  - 데이터가 변경됨에 따라 적절한 컴포넌트만 효율적으로 갱신하고 렌더링한다.

- **가상 DOM (Virtual DOM)**
  - 실제 DOM을 직접 조작하는 대신, 메모리에 가상의 DOM을 두고 데이터 변경 시 이전 가상 DOM과 비교(Diffing)하여 바뀐 부분만 실제 DOM에 반영(Reconciliation)한다.
  - 이를 통해 브라우저 연산 횟수를 줄이고 렌더링 성능을 극대화한다.

- **단방향 데이터 흐름 (One-way Data Binding)**
  - 데이터는 항상 부모 컴포넌트에서 자식 컴포넌트로만 흐른다 (Props를 통해 전달).
  - 데이터 흐름이 단순하여 디버깅이 쉽고 코드의 예측 가능성이 높아진다.

---

## 2. JSX (JavaScript XML)

JSX는 JavaScript 코드 안에서 HTML 형태의 마크업을 작성할 수 있도록 해주는 **구문 확장(Syntactic Sugar)** 이다. 브라우저는 JSX를 직접 읽을 수 없으므로, 빌드 도구(Babel 등)를 통해 순수 JavaScript로 변환되는 과정을 거친다.

### JSX의 변환 방식

#### 1) React 17 이전 (Legacy)
Babel은 JSX를 `React.createElement()` 함수 호출로 변환했다. 이 때문에 JSX를 사용하는 모든 파일 상단에 `import React from 'react';`가 필수적이었다.

```javascript
// 개발자가 작성한 JSX
const element = <h1 className="title">Hello World</h1>;

// Babel이 변환한 결과
const element = React.createElement('h1', { className: 'title' }, 'Hello World');
````

#### 2) React 17 이후 (New JSX Transform)

React 17부터는 컴파일러가 `react/jsx-runtime`을 자동으로 도입하여 변환한다. 더 이상 파일 상단에 `import React`를 명시하지 않아도 된다.

```javascript
// Babel이 변환한 결과 (React 17+)
import { jsx as _jsx } from 'react/jsx-runtime';
const element = _jsx('h1', { className: 'title', children: 'Hello World' });
```

이 변환 결과로 생성되는 것이 바로 **React 엘리먼트**다. 이는 실제 DOM 노드가 아니라, UI가 어떻게 생겼는지 설명하는 가볍고 **불변성(Immutable)을 가진 일반 JavaScript 객체**다.

### JSX의 언어적 특징 및 제약

- **표현식으로서의 JSX:** JSX는 컴파일되면 결국 일반 JavaScript 객체가 된다. 따라서 `if`문이나 `for`문 내부에서 사용될 수 있고, 변수에 할당하거나 함수의 인자로 전달하고 반환할 수 있다.
- **XSS(크로스 사이트 스크립팅) 공격 방지:** React는 렌더링하기 전에 JSX에 삽입된 모든 값을 기본적으로 이스케이프(Escape) 처리하여 문자열로 변환한다. 이 덕분에 악성 스크립트 주입 공격을 원천 차단할 수 있다.
- **단일 루트 노드 제약:** JSX는 반드시 하나의 부모 태그로 감싸져야 한다. 그 이유는 JavaScript 함수는 오직 하나의 객체만 반환할 수 있기 때문이다. 여러 태그를 반환하려면 배열로 묶거나 `<React.Fragment>` (또는 `<></>`)로 감싸야 한다.

---

## 3. State vs Props

React에서 데이터를 다루는 두 가지 핵심 개념이다.

| 구분           | Props                     | State                        |
| :----------- | :------------------------ | :--------------------------- |
| **개념**       | 부모 컴포넌트로부터 전달받은 데이터       | 컴포넌트 내부에서 생성하고 관리하는 상태 데이터   |
| **변경 가능 여부** | 읽기 전용 (변경 불가능)            | 변경 가능                        |
| **용도**       | 컴포넌트 간 데이터 전달             | 컴포넌트의 동적 상태 관리               |
| **트리거**      | 부모가 새로운 Props를 전달할 때 리렌더링 | `setState` 호출로 상태가 변할 때 리렌더링 |

### Props가 불변(Read-Only)인 이유

React는 **컴포넌트를 순수 함수(Pure Function)처럼** 다루어야 한다는 원칙을 가진다. 입력값(Props)이 동일하면 항상 동일한 UI를 반환해야 예측 가능하고 디버깅이 쉬운 애플리케이션을 만들 수 있기 때문이다. <span style="background:rgba(240, 200, 0, 0.2)">자식 컴포넌트가 전달받은 Props를 직접 수정하는 것은 금지되며, 변경이 필요하다면 부모에게 이벤트를 전달하여 부모의 State를 바꾸어야 한다.</span>

### State의 비동기적 배치(Batching) 처리

`useState`의 상태 변경 함수(`setCount` 등)는 호출 즉시 상태를 변경하지 않는다. 성능 최적화를 위해 React는 하나의 이벤트 핸들러 내에서 발생하는 여러 상태 변경 요청을 모아서 한 번에 처리(Batching)한다.

```javascript
const [count, setCount] = useState(0);

const handleClick = () => {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
  // 이 함수가 끝나도 count는 3이 아니라 1이 된다. 
  // 동일한 렌더링 주기 내에서 count는 여전히 0이기 때문이다.
};

// 해결책: 함수형 업데이트 사용
const handleClickCorrect = () => {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  // 이전 상태값을 인자로 받아 순차적으로 계산하므로 결과는 3이 된다.
};
```

#### 1. 왜 Batch(일괄) 처리를 하는가?

React가 상태 업데이트를 즉시 반영하지 않고 모아서 한 번에 처리(Batching)하는 이유는 크게 두 가지다.

##### ① 불필요한 리렌더링 방지를 통한 성능 최적화

- 컴포넌트가 리렌더링되면 가상 DOM 비교, 실제 DOM 반영, 브라우저의 Reflow/Repaint 등 무거운 연산이 발생한다.
- 만약 하나의 클릭 이벤트 안에서 상태가 5번 바뀐다고 가정했을 때, 배치 처리가 없다면 브라우저는 매번 리렌더링을 수행하여 총 5번 화면을 다시 그려야 한다. 이는 심각한 성능 저하를 유발한다.
- React는 이벤트를 처리하는 동안 발생하는 모든 상태 업데이트를 큐(Queue)에 쌓아두었다가, **이벤트 핸들러가 끝나는 시점에 단 한 번만 리렌더링**을 수행한다.

##### ② UI의 일관성(Consistency) 유지

- 여러 상태가 동시에 변경될 때, 일부 상태만 먼저 반영된 "불완전한 상태의 UI"가 사용자에게 노출되는 것을 방지한다. 모든 상태가 완전히 업데이트된 최종 결과물만 화면에 렌더링되도록 보장한다.

> **💡 React 18의 Automatic Batching (자동 배치)**
> 
> - React 17 이전에는 오직 React의 이벤트 핸들러 내부에서만 배치가 작동했다. `setTimeout`, `Promise`, native 이벤트 핸들러 내부의 상태 업데이트는 배치 처리가 되지 않고 매번 리렌더링을 유발했다.
> - **React 18부터는 어디서 상태 업데이트가 발생하든 상관없이 자동으로 배치 처리(Automatic Batching)가 적용된다.**

#### 2. 일반 업데이트 vs 함수형 업데이트의 내부 동작 원리

이 차이를 이해하려면 **"State는 렌더링의 스냅샷(Snapshot)이다"** 라는 React의 대원칙을 알아야 한다.
즉, 하나의 이벤트 핸들러 안에서 State 값은 변하지 않는 상수로 취급된다.

##### ① 일반 업데이트 (`setCount(count + 1)`)가 실패하는 이유

React에서 State는 일반적인 변수처럼 실시간으로 값이 변하는 것이 아니다. **특정 렌더링 주기(Render Cycle) 내에서 State는 절대 변하지 않는 상수(스냅샷)** 처럼 동작한다.

```javascript
const [count, setCount] = useState(0);

const handleClick = () => {
  setCount(count + 1); // count는 0이므로 setCount(0 + 1) 호출
  setCount(count + 1); // count는 여전히 0이므로 setCount(0 + 1) 호출
  setCount(count + 1); // count는 여전히 0이므로 setCount(0 + 1) 호출
};
```

- `handleClick`이 실행되는 시점에 `count` 값은 `0`으로 고정되어 있다.
- 따라서 위 코드는 React 내부적으로 `setCount(1)`, `setCount(1)`, `setCount(1)`을 연속으로 호출한 것과 같다.
- React는 배치 처리를 위해 이 명령들을 큐에 담는다.
    - 업데이트 큐: `[ 1, 1, 1 ]` (이전 값을 덮어씀)
- 함수가 끝나고 큐를 실행할 때 마지막 값인 `1`만 적용되므로, 최종 `count`는 `1`이 된다.

---

##### ② 함수형 업데이트 (`setCount(prev => prev + 1)`)가 성공하는 이유

함수형 업데이트를 사용하면, React에 **"값"을 전달하는 것이 아니라 "상태를 어떻게 변경할지 정의한 함수(Updater Function)"를 전달**하게 된다.

```javascript
const [count, setCount] = useState(0);

const handleClickCorrect = () => {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
};
```

- React는 이 함수들을 실행하지 않고, 일단 업데이트 큐에 순서대로 쌓아둔다.
    - 업데이트 큐: `[ prev => prev + 1, prev => prev + 1, prev => prev + 1 ]`
- 이벤트 핸들러가 끝나고 배치 처리가 시작되면, React는 큐에 담긴 함수들을 **순차적으로 실행**한다.
- 이때 핵심은 **이전 함수의 실행 결과(반환값)를 다음 함수의 인자(`prev`)로 전달**한다는 점이다.

```text
[React 내부의 큐 처리 과정]
1. 첫 번째 함수 실행: 인자 prev = 0 (현재 상태) -> 반환값 1
2. 두 번째 함수 실행: 인자 prev = 1 (이전 함수의 반환값) -> 반환값 2
3. 세 번째 함수 실행: 인자 prev = 2 (이전 함수의 반환값) -> 반환값 3
```

- 모든 함수의 실행이 끝난 후 최종 결과값인 `3`을 새로운 State로 설정하고 단 한 번의 리렌더링을 수행한다.
- 이처럼 함수형 업데이트는 **"아직 렌더링되지 않은, 큐에 대기 중인 최신 임시 상태값"**을 안전하게 참조할 수 있도록 보장하기 때문에 정상적으로 작동한다.
---

## 4. 핵심 React Hooks

Hooks는 클래스 컴포넌트의 생명주기 메서드(`componentDidMount` 등)를 함수형 컴포넌트에서도 사용할 수 있도록 도입된 기능이다.

### Hooks의 두 가지 핵심 규칙

- **최상위(Top Level)에서만 호출해야 한다:** 반복문, 조건문, 중첩된 함수 내에서 Hook을 호출하면 안 된다.
- **React 함수 내에서만 호출해야 한다:** 일반 JavaScript 함수가 아닌, React 함수형 컴포넌트나 커스텀 Hook 내에서만 호출해야 한다.

### 왜 규칙을 지켜야 하는가? (내부 동작 원리)

React는 각 컴포넌트가 사용하는 Hook의 상태를 **호출된 순서대로 연결 리스트(Linked List) 형태로 저장**한다. 조건문이나 반복문 안에서 Hook을 호출하면 렌더링할 때마다 호출 순서가 뒤바뀔 수 있으며, 이 경우 React는 어떤 상태가 어떤 `useState`에 매칭되는지 찾아내지 못해 메모리 오염 및 버그를 발생시킨다.

- **useState**
  - 컴포넌트에 상태(state) 변수를 추가할 때 사용한다.
- **useEffect**
  - 컴포넌트가 렌더링될 때마다 특정 작업(Side Effect)을 수행할 수 있도록 설정한다. (API 호출, 이벤트 리스너 등록 등)
- **useRef**
  - 저장공간 또는 DOM 요소에 직접 접근할 때 사용하며, 값이 변해도 컴포넌트가 리렌더링되지 않는다.
- **useMemo & useCallback**
  - 성능 최적화를 위해 연산된 값이나 함수를 재사용(메모이제이션)할 때 사용한다.

---

## 5. 기본 코드 예시 (Counter 컴포넌트)

가장 기본적인 State와 Event Handling을 보여주는 카운터 예제다.

```jsx
import React, { useState, useEffect } from 'react';

function Counter({ title }) {
  // 1. State 선언
  const [count, setCount] = useState(0);

  // 2. Effect 정의 (마운트 및 count 변경 시 실행)
  useEffect(() => {
    console.log(`현재 카운트: ${count}`);
  }, [count]);

  // 3. 이벤트 핸들러 함수
  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  return (
    <div className="counter-container">
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={handleIncrement}>+1 증가</button>
      <button onClick={handleDecrement}>-1 감소</button>
    </div>
  );
}

export default Counter;
```

## 6. 학습 로드맵 및 연관 노트

- [ ] React Fiber 아키텍처와 동시성 모드(Concurrent Mode) 학습하기
- [ ] `useEffect` 내부의 클린업(Cleanup) 함수와 메모리 누수 방지 원리 정리하기
- [ ] React의 한계(SEO, 초기 로딩 속도)를 극복하기 위한 [Next.js](app://obsidian.md/Next.js) 학습하기
