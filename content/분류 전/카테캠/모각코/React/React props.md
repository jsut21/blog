**props**는 **Properties**의 약어로, 리액트에서 부모 컴포넌트가 자식 컴포넌트에게 데이터를 전달할 때 사용하는 **매개변수(Parameter)**다. 

컴퓨터공학 관점에서 리액트의 컴포넌트는 JSX를 반환하는 '함수'이며, **`props`는 이 함수에 전달되는 '인자(Argument)'** 로 이해하면 가장 직관적이다.

---

## 1. 코드 예시로 보는 props

부모 컴포넌트가 자식 컴포넌트를 호출하면서 속성(Attribute)을 부여하면, 리액트는 이를 하나의 객체(Object)로 묶어 자식 컴포넌트의 첫 번째 인자로 전달한다.

```jsx
// 1. 부모 컴포넌트 (Parent)
function App() {
  return (
    // 자식 컴포넌트에게 name과 age라는 props를 전달한다.
    <UserCard name="홍길동" age={23} />
  );
}

// 2. 자식 컴포넌트 (Child)
// 전달받은 props는 { name: "홍길동", age: 23 } 형태의 객체다.
function UserCard(props) {
  return (
    <div>
      <h2>이름: {props.name}</h2>
      <p>나이: {props.age}</p>
    </div>
  );
}
```

자바스크립트의 **객체 구조 분해 할당(Destructuring Assignment)** 을 사용하면 다음과 같이 더 간결하게 작성할 수 있다.

```jsx
function UserCard({ name, age }) {
  return (
    <div>
      <h2>이름: {name}</h2>
      <p>나이: {age}</p>
    </div>
  );
}
```

---

## 2. CS 관점에서 본 props의 핵심 특징

#### ① 불변성 (Immutability)과 순수 함수 (Pure Function)
- `props`는 **읽기 전용(Read-Only)** 이다. 자식 컴포넌트는 전달받은 `props`를 직접 수정(Mutation)할 수 없다.
- 리액트는 컴포넌트를 **순수 함수**로 취급한다. 즉, 동일한 입력값(`props`)이 주어지면 항상 동일한 출력값(JSX)을 반환해야 한다는 함수형 프로그래밍 원칙을 따른다.
- 만약 데이터를 변경해야 한다면, `props`를 수정하는 것이 아니라 부모 컴포넌트의 상태(State)를 변경하여 새로운 `props`를 내려받아야 한다.

#### ② 단방향 데이터 흐름 (Unidirectional Data Flow)
- 데이터는 항상 **부모에서 자식 방향(Top-Down)**으로만 흐른다.
- 자식 컴포넌트가 부모 컴포넌트의 상태를 변경하고 싶다면, 부모로부터 상태를 변경하는 **콜백 함수(Callback Function)**를 `props`로 전달받아 실행하는 방식을 사용한다. (이를 State Lifting Up, 상태 끌어올리기라고 한다.)

---

### 💡 요약
- **개념:** 부모 컴포넌트가 자식 컴포넌트에게 전달하는 데이터 객체다.
- **역할:** 컴포넌트의 재사용성을 높이기 위해 외부로부터 동적인 값을 주입받는 통로다.
- **본질:** 함수형 컴포넌트의 **함수 인자(Argument)**이며, 부작용(Side Effect)을 방지하기 위해 **불변(Immutable)** 상태로 유지된다.