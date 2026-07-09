## 1. JSX는 결국 JavaScript로 바뀐다

먼저 React 코드는 브라우저에서 그대로 실행되지 않는다. JSX는 JavaScript 함수 호출 형태로 변환된다.

예를 들어 다음 JSX는

``` jsx
return <button onClick={handleClick}>{count}</button>;
```

대략 다음과 같은 JavaScript 코드로 변환된다.

``` js
return _jsx("button", {
  onClick: handleClick,
  children: count,
});
```

따라서 다음 React 컴포넌트는

``` jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}
```

대략 다음과 같은 JavaScript 코드라고 볼 수 있다.

``` js
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return _jsx("button", {
    onClick: handleClick,
    children: count,
  });
}
```


## 정리

JSX는 JavaScript 자체의 일반적인 syntactic sugar라기보다는, UI tree를 표현하기 위해 JavaScript 위에 얹은 syntax extension이다.

JSX는 브라우저가 직접 실행하는 문법이 아니다. 컴파일 과정을 거쳐 `React.createElement`나 `jsx` 런타임 호출로 변환된다. 따라서 JSX의 의미는 JavaScript 엔진이 정하는 것이 아니라, 변환 도구와 UI 런타임이 정한다.

이 점에서 JSX는 React라는 UI 런타임과 강하게 연결되어 있다. React는 스스로를 라이브러리라고 부르지만, 컴포넌트 호출, state 저장, 업데이트 큐, 렌더링, DOM 반영을 React가 관리한다는 점에서 UI 영역 안에서는 프레임워크처럼 동작한다.

따라서 JSX는 단순히 JavaScript를 짧게 쓰는 문법이 아니라, React의 선언적 UI 모델을 JavaScript 안에서 자연스럽게 표현하기 위한 DSL에 가깝다.