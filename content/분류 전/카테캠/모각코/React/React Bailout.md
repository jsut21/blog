부모 컴포넌트가 재렌더링되더라도 자식 컴포넌트의 렌더 단계(Render phase) 진입을 건너뛰는(Skip) 예외 케이스들이 존재한다.

리액트 내부에서는 이를 **Bailout(건너뛰기/탈출)** 이라고 부르며, 크게 세 가지 메커니즘을 통해 트리거를 방지한다.

---

## 1. Memoization (`React.memo`)
가장 대표적인 방법으로, 컴포넌트를 고차 컴포넌트(HOC)인 `React.memo`로 감싸는 것이다.

``` jsx
const MemoizedComponent = React.memo(MyComponent);
```

- **동작 원리:** 부모가 재렌더링될 때, 리액트는 자식 컴포넌트의 이전 `props`와 새로운 `props`를 **얕은 비교(Shallow Compare)**한다.
- **결과:** `props`가 메모리 주소 수준에서 변경되지 않았다면, 리액트는 해당 자식 컴포넌트의 Render phase를 완전히 건너뛰고 이전 렌더링 결과를 재사용한다.

## 💡 CSS 이벤트 모델과의 비교 (개념적 이해)

리액트의 Bailout을 이해할 때 CSS의 이벤트 전파(Event Propagation)와 혼동하기 쉽지만, 두 메커니즘은 흐름의 방향과 목적이 다르다.

| 구분 | CSS 이벤트 전파 | React 렌더링 (Bailout) |
| :--- | :--- | :--- |
| **흐름 방향** | 양방향 (캡처링: 위→아래, 버블링: 아래→위) | **단방향 (Top-down: 위→아래)** |
| **전파의 주체** | 사용자 인터랙션 (이벤트) | 상태 변화에 따른 렌더링 명령 |
| **중단 목적** | 이벤트가 상위/하위 요소로 전달되는 것을 방지 | 불필요한 하위 트리 렌더링 연산 방지 |
| **중단 방법** | `e.stopPropagation()` | `React.memo`, `useMemo` 등 |

- **핵심 차이:** 
  - CSS 이벤트는 **"아래에서 위로(버블링)"** 올라가는 흐름을 끊는 것이 중요하지만, 리액트 렌더링은 **"위에서 아래로"** 내려오는 하향식 재귀 호출.
  - 따라서 리액트의 Bailout은 **"부모로부터 내려오는 렌더링 명령을 해당 지점에서 차단하여, 그 아래의 모든 자식 컴포넌트까지 렌더링을 스킵"**하는 하향식 최적화 기법.

---

## 2. Same Element Reference (동일 엘리먼트 참조 / Composition)
리액트 엘리먼트의 참조(Reference)가 변하지 않았다면, 리액트는 해당 컴포넌트가 변경되지 않았다고 판단하여 재렌더링을 하지 않는다. 주로 **컴포지션(Composition) 패턴**에서 발생한다.

- **예시 코드:**
  ```jsx
  function Parent({ children }) {
    const [count, setCount] = useState(0);
    return (
      <button onClick={() => setCount(count + 1)}>
        {count}
        {children} {/* 이 children은 재렌더링되지 않음 */}
      </button>
    );
  }
  ```
- **동작 원리:** `Parent` 컴포넌트의 상태(`count`)가 변경되어 `Parent`는 재렌더링된다. 하지만 `children`으로 주입된 컴포넌트는 `Parent`가 아니라 더 상위 컴포넌트에서 이미 생성되어 전달된 것이다. 
- **결과:** `children` 엘리먼트의 참조 주소가 이전 렌더링과 동일하므로, 리액트는 `children` 하위 트리의 Render phase를 건너뛴다.

---

## 3. React Fiber의 자체 Bailout 조건
리액트의 조정(Reconciliation) 엔진인 Fiber는 컴포넌트의 렌더링을 시작하기 전에 내부적으로 다음과 같은 최적화 검사를 수행한다.

- **Bailout 조건:**
  1. 컴포넌트의 이전 `props`와 다음 `props`가 엄격한 동등 비교(`Object.is`)를 통해 완전히 일치하는가?
  2. 컴포넌트가 구독하고 있는 Context의 값이 변경되지 않았는가?
  3. 컴포넌트 자체에 대기 중인 상태 업데이트(State Update)가 없는가?
- **결과:** 이 조건들이 모두 충족되면 부모가 재렌더링되더라도 해당 자식 컴포넌트는 Render phase를 거치지 않고 즉시 탈출(Bailout)한다.

---

## 💡 CS 관점에서의 요약
- 리액트는 부모가 재렌더링될 때 자식 컴포넌트의 재렌더링을 기본값(Default)으로 설정해 두었다. 이는 일관성(Consistency)을 유지하기 위한 안전한 선택이다.
- 하지만 **참조 동일성(Referential Equality)**을 보장할 수 있는 장치(`React.memo`, `children` 패턴 등)를 마련해 두면, 리액트는 $O(1)$의 참조 비교만 수행한 뒤 렌더링 파이프라인에서 해당 서브트리를 즉시 제외(Bailout)시킨다.