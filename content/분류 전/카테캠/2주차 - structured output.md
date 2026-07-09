---
title: 2주차 - Structured Output
created: 2026-07-07
draft: false
commit: false
tags:
  - llm/structured-output
---

## LLM에서 Structured Output이 필요한 이유

LLM은 기본적으로 자연어를 생성하는 모델이다. 그래서 사람이 읽기에는 유연하고 풍부한 답변을 만들 수 있지만, 프로그램이 바로 사용하기에는 불안정한 경우가 많다.

예를 들어 같은 질문을 해도 어떤 때는 문장으로 답하고, 어떤 때는 목록으로 답하고, 어떤 때는 필요한 필드를 빠뜨릴 수 있다. 사람은 맥락으로 이해할 수 있지만, 애플리케이션 입장에서는 출력 형식이 조금만 달라져도 파싱이 실패하거나 후속 로직이 깨질 수 있다.

따라서 LLM을 단순한 챗봇이 아니라 실제 시스템의 일부로 사용하려면, 모델의 응답을 정해진 구조로 받는 것이 중요하다. JSON, enum, schema 같은 형식을 강제하면 LLM의 출력을 데이터처럼 다룰 수 있고, API 호출, DB 저장, UI 렌더링, 자동화 워크플로우와 연결하기 쉬워진다.

Structured output은 결국 LLM의 자유로운 자연어 출력을 애플리케이션이 다룰 수 있는 데이터 출력으로 바꾸는 방법이다.

## 초기 접근: Few-shot Prompting

초기에는 이런 문제를 해결하기 위해 프롬프트에 예시를 넣는 few-shot 방식이 많이 사용되었다.

few-shot은 모델에게 "이런 입력이 들어오면 이런 형식으로 답하라"는 예시를 몇 개 보여주고, 그 패턴을 따라 하도록 유도하는 방식이다.

예를 들어 사용자의 요청에서 이름, 날짜, 작업 내용을 추출해야 한다면 다음처럼 예시를 넣을 수 있다.

```text
입력: 내일 오후 3시에 민수에게 회의 자료 보내기
출력:
{
  "date": "내일",
  "time": "오후 3시",
  "person": "민수",
  "task": "회의 자료 보내기"
}

입력: 금요일 오전에 지영이랑 점심 약속 잡기
출력:
{
  "date": "금요일",
  "time": "오전",
  "person": "지영",
  "task": "점심 약속 잡기"
}
```

이 방식은 간단하고 직관적이다. 별도의 도구나 API 기능 없이도 프롬프트만으로 어느 정도 구조화된 응답을 얻을 수 있다.

하지만 few-shot은 어디까지나 모델이 예시를 보고 따라 하도록 유도하는 방식이다. 형식이 반드시 보장되는 것은 아니기 때문에, 모델이 JSON 앞뒤에 설명 문장을 붙이거나, 따옴표를 빠뜨리거나, 없는 필드를 추가하는 문제가 생길 수 있다.

그래서 이후에는 단순히 예시를 보여주는 수준을 넘어서, 출력 형식을 더 강하게 제한하거나 검증하는 방식이 필요해졌다.

## 프레임워크의 선행 접근: Pydantic Output Parser

OpenAI Structured Outputs가 나오기 전에도 개발자들은 structured output 문제를 계속 해결하려고 했다. 그중 대표적인 방식이 LangChain 같은 프레임워크에서 Pydantic 모델을 output parser로 사용하는 방식이다.

흐름상으로는 LangChain의 Pydantic 기반 output parser가 OpenAI Structured Outputs보다 먼저 널리 쓰였다. LangChain에는 2023년 3월에 이미 `PydanticOutputParser`가 추가되어 있었고, OpenAI의 Structured Outputs와 SDK의 Pydantic 지원은 2024년 8월에 발표되었다.

다만 "OpenAI가 LangChain을 보고 그대로 따라 했다"고 인과를 단정하기는 어렵다. 더 정확히는, LLM 출력이 앱에서 쓰기에는 불안정하다는 같은 문제를 프레임워크들이 먼저 parser/retry 방식으로 풀었고, 이후 OpenAI가 그 문제를 provider API 차원에서 더 강하게 해결하는 기능을 제공한 것으로 보는 게 안전하다.

LangChain의 초기 방식은 대략 다음과 같다.

1. 개발자가 Pydantic `BaseModel`로 원하는 출력 구조를 선언한다.
2. LangChain이 이 모델에서 JSON Schema와 format instruction을 만든다.
3. 모델에게 "이 schema에 맞는 JSON으로 답하라"고 프롬프트에 넣는다.
4. 모델이 만든 문자열을 JSON으로 파싱한다.
5. 파싱된 JSON을 다시 Pydantic 모델로 검증한다.
6. 실패하면 output fixing parser나 retry parser로 다시 시도한다.

즉, 이 시기의 핵심은 provider가 schema를 직접 강제하는 것이 아니라, 프레임워크가 프롬프트, parser, validation, retry를 묶어서 structured output처럼 보이게 만드는 것이었다.

OpenAI Structured Outputs는 이 흐름을 API 레벨로 끌어올린 것에 가깝다. 개발자가 JSON Schema나 Pydantic 모델을 넘기면 SDK와 provider가 schema 변환, JSON 생성, typed object 파싱을 더 직접적으로 처리한다.

정리하면 순서는 다음처럼 볼 수 있다.

```text
few-shot prompting
-> LangChain 같은 프레임워크의 JSON/Pydantic output parser
-> function calling / tool calling 기반 구조화
-> OpenAI Structured Outputs 같은 provider-native structured output
```

## OpenAI Structured Outputs

OpenAI의 Structured Outputs는 모델 응답이 개발자가 정의한 JSON Schema를 따르도록 만드는 API 기능이다. 이전의 JSON mode는 "유효한 JSON"을 만들게 하는 데 가깝고, Structured Outputs는 "정해진 schema를 따르는 JSON"을 만들게 하는 데 초점이 있다.

중요한 차이는 key 누락 문제다. 일반 프롬프트나 JSON mode에서는 모델이 JSON을 만들더라도 `date` 같은 필드를 빼먹거나, enum에 없는 값을 넣거나, 설명 문장을 섞을 수 있다. Structured Outputs는 `strict: true`와 schema를 함께 전달해서 이런 오류를 모델 출력 단계에서 줄이거나 막는 방식이다.

OpenAI API에서는 크게 두 흐름에서 쓴다.

- 모델이 사용자에게 답변할 때 구조화된 결과가 필요하면 Chat Completions에서는 `response_format`, Responses API에서는 `text.format`에 `json_schema`를 지정한다.
- 모델이 앱의 함수나 도구를 호출해야 하면 function calling/tool calling의 parameters schema를 사용한다.

핵심은 "프롬프트로 부탁하는 것"에서 "API에 schema를 계약으로 넘기는 것"으로 이동했다는 점이다.

## Pydantic BaseModel로 타입 선언하기

Python에서는 Pydantic의 `BaseModel`로 원하는 출력 타입을 코드로 선언할 수 있다. OpenAI Python SDK는 이 모델을 schema처럼 사용해서 응답을 파싱할 수 있다.

```python
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI()

class CalendarEvent(BaseModel):
    name: str
    date: str
    participants: list[str]

completion = client.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {
            "role": "user",
            "content": "Alice and Bob are going to a science fair on Friday.",
        }
    ],
    response_format=CalendarEvent,
)

event = completion.choices[0].message.parsed
```

이렇게 하면 코드 입장에서는 `event.name`, `event.date`, `event.participants`처럼 타입이 있는 객체를 다룰 수 있다.

Pydantic class를 쓰는 장점은 출력 구조를 코드의 타입으로 명확하게 선언할 수 있다는 점이다. 어떤 key가 있어야 하는지, 각 key의 타입이 무엇인지, enum이나 범위 제약이 있는지를 한 곳에 적을 수 있다. 그래서 모델이 응답을 만들 때도 이 구조를 기준으로 삼을 수 있고, 애플리케이션에서는 key 누락을 줄이거나 방지할 수 있다.

예를 들어 `CalendarEvent`에 `name`, `date`, `participants`가 선언되어 있으면 응답에는 이 세 key가 모두 들어와야 한다. key가 빠지면 정상 객체로 파싱되지 않는다. 이런 의미에서 Pydantic class는 structured output의 계약 역할을 한다.

다만 여기서 헷갈리면 안 되는 부분이 있다. `BaseModel`은 기본적으로 "검증하고 파싱하는 타입 선언"이다. 모델에게 그냥 프롬프트로 JSON을 만들게 한 뒤 Pydantic으로 검증만 하면, key 누락을 사전에 막는다기보다는 누락을 validation error로 잡아낸다. key 누락을 실제로 줄이는 힘은 Pydantic schema를 모델 호출 단계에 전달하고, 실패하면 재시도하거나 provider-native structured output으로 schema adherence를 강제할 때 나온다.

즉, key 누락 문제는 다음 두 층을 구분해야 한다.

- 프롬프트 + Pydantic parser: 모델 출력이 틀릴 수 있고, Pydantic은 틀렸다는 것을 잡아낸다. 필요하면 파싱 실패 후 재시도 로직을 붙인다.
- Provider-native structured output: OpenAI 같은 provider가 schema를 직접 받아 모델 출력 단계에서 schema adherence를 강하게 보장한다.

단점은 파싱 단계가 길어지고, 파싱 오류가 자주 발생할 수 있다는 것이다. 모델 출력 문자열을 JSON으로 파싱하고, 다시 Pydantic 모델로 검증하고, 실패하면 오류 메시지를 만들어 모델에게 다시 요청하는 흐름이 생긴다. 구조가 조금만 어긋나도 JSON parse error나 validation error가 나기 때문에, 단순 자연어 응답보다 처리 파이프라인이 복잡해진다.

그래서 Pydantic 방식은 "key 누락을 막기 위한 schema 계약"이라는 장점과 "파싱/검증/재시도 단계가 늘어난다"는 단점을 동시에 가진다.

OpenAI Structured Outputs에서는 모든 field가 required로 다뤄지는 제약이 있다. 선택값이 필요하면 field를 아예 생략하게 만들기보다는 `null`을 허용하는 타입으로 표현하는 식으로 설계한다.

```python
from pydantic import BaseModel
from typing import Literal

class ProductReview(BaseModel):
    rating: int | None
    sentiment: Literal["positive", "negative", "neutral"]
    key_points: list[str]
```

여기서 `rating`은 값이 없을 수 있지만 key 자체를 빼는 것이 아니라 `"rating": null`처럼 구조는 유지하는 방향으로 생각하면 된다.

## 수업 노트북 기준: 기존 BaseModel을 그대로 사용한다

수업 파일에서 쓰는 Pydantic은 LLM 전용으로 새로 나온 별도 문법이 아니다. 기존에 Python에서 데이터 검증용으로 쓰던 `pydantic.BaseModel`을 그대로 사용한다.

차이는 이 `BaseModel` class를 LangChain의 `response_format`에 넘긴다는 점이다. 그러면 LangChain은 이 class를 보고 모델이 어떤 구조로 답해야 하는지 schema로 사용하고, 결과를 다시 Pydantic 객체로 검증한다.

수업 노트북의 흐름은 다음과 같다.

```python
from pydantic import BaseModel, Field
from typing import Literal

class ScheduleCreate(BaseModel):
    title: str = Field(description="일정 제목")
    date: str = Field(description="YYYY-MM-DD")
    start_time: str = Field(description="HH:MM")
    attendees: list[str] = Field(default_factory=list)

class TodoCreate(BaseModel):
    title: str
    due_date: str | None = Field(default=None, description="YYYY-MM-DD")
    priority: Literal["low", "medium", "high"] = "medium"

class ExtractionResult(BaseModel):
    kind: Literal["schedule", "todo", "unknown"]
    schedule: list[ScheduleCreate] | None = None
    todo: TodoCreate | None = None
    question: str | None = None

extract_agent = create_agent(
    model=make_model(),
    tools=[],
    response_format=ExtractionResult,
    system_prompt="사용자 요청을 schedule, todo, unknown 중 하나로 구조화한다.",
)
```

여기서 `ScheduleCreate`, `TodoCreate`, `ExtractionResult`는 평범한 Pydantic 모델이다. `title`, `date`, `kind` 같은 필드는 앱에서 사용할 데이터 key가 되고, `Field(description=...)`은 모델이 값을 어떻게 채워야 하는지 알려주는 힌트가 된다.

실행 결과는 자연어 문장이 아니라 `result["structured_response"]`에 들어 있는 `ExtractionResult` 객체다. 그래서 이후 코드는 모델의 문장을 읽는 것이 아니라 `structured_response.kind`, `structured_response.schedule`, `structured_response.model_dump()`처럼 Pydantic 객체를 기준으로 동작한다.

## response_format에는 하나의 root schema를 넘긴다

`response_format`에 여러 class를 한 번에 넘기는 방식은 안정적이지 않다. 보통 `response_format=[ScheduleCreate, TodoCreate]`처럼 두 개를 나란히 전달하는 식으로는 동작하지 않거나, schema 생성/파싱 단계에서 오류가 난다.

이유는 structured output의 최종 응답에는 하나의 root schema가 필요하기 때문이다. 모델과 parser 입장에서는 "최종 응답 전체가 어떤 모양이어야 하는가"가 하나로 정해져 있어야 한다.

잘 안 되는 형태는 이런 식이다.

```python
extract_agent = create_agent(
    model=make_model(),
    tools=[],
    response_format=[ScheduleCreate, TodoCreate],  # 여러 class를 직접 전달
)
```

또는 상황에 따라 schedule일 수도 있고 todo일 수도 있으니 단순히 union처럼 생각하는 방식도 오류가 나거나 모델이 헷갈리는 경우가 많다.

```python
response_format=ScheduleCreate | TodoCreate
```

이런 구조에서는 모델이 어떤 top-level schema를 따라야 하는지 불명확해질 수 있다. 어떤 때는 일정 객체를 만들고, 어떤 때는 할 일 객체를 만들면 parser가 기대하는 최종 구조와 어긋나 validation error가 나기 쉽다.

그래서 수업 코드처럼 상위 wrapper class를 하나 만든다.

```python
class ExtractionResult(BaseModel):
    kind: Literal["schedule", "todo", "unknown"]
    schedule: list[ScheduleCreate] | None = None
    todo: TodoCreate | None = None
    question: str | None = None

extract_agent = create_agent(
    model=make_model(),
    tools=[],
    response_format=ExtractionResult,
)
```

이 방식에서는 `response_format`에 넘기는 class는 `ExtractionResult` 하나다. 대신 그 안에서 `kind`로 어떤 결과인지 구분하고, 실제 세부 데이터는 `schedule`, `todo`, `question` 중 필요한 필드에 넣는다.

여러 종류의 결과가 동시에 나올 수 있다면 wrapper class를 이렇게 바꾸는 편이 낫다.

```python
class ExtractionResult(BaseModel):
    schedules: list[ScheduleCreate] = Field(default_factory=list)
    todos: list[TodoCreate] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
```

이렇게 하면 최종 schema는 여전히 하나지만, 그 안에서 여러 일정과 여러 할 일을 동시에 담을 수 있다.

정리하면 `response_format`은 여러 class를 직접 받는 자리가 아니라, 최종 응답 전체를 설명하는 하나의 root model을 받는 자리다. 여러 class가 필요하면 각각을 nested model로 만들고, wrapper model 하나에 넣어서 전달한다.

## Nested model로 list 원소 구조를 고정한다

`ScheduleCreate`를 따로 class로 나누는 이유는 list 안에 들어갈 원소의 구조를 명확히 하기 위해서다.

단순히 "일정 목록을 list로 줘"라고 하면 모델 입장에서는 list 안에 문자열을 넣어도 되는지, dict를 넣어야 하는지, 각 dict에 어떤 key가 있어야 하는지 애매해진다.

예를 들어 다음처럼 쓰면 원소 구조가 약하다.

```python
class ExtractionResult(BaseModel):
    kind: Literal["schedule", "todo", "unknown"]
    schedule: list | None = None
```

이 경우 모델이 다음처럼 제각각 출력할 수 있다.

```json
{
  "kind": "schedule",
  "schedule": ["금요일 3시 회의", "다음 주 월요일 점심"]
}
```

또는 이런 형태가 될 수도 있다.

```json
{
  "kind": "schedule",
  "schedule": [
    {"title": "회의", "time": "금요일 3시"}
  ]
}
```

하지만 `schedule: list[ScheduleCreate] | None`처럼 쓰면 list의 각 원소가 반드시 `ScheduleCreate` 구조를 따라야 한다.

```python
class ScheduleCreate(BaseModel):
    title: str = Field(description="일정 제목")
    date: str = Field(description="YYYY-MM-DD")
    start_time: str = Field(description="HH:MM")
    attendees: list[str] = Field(default_factory=list)

class ExtractionResult(BaseModel):
    kind: Literal["schedule", "todo", "unknown"]
    schedule: list[ScheduleCreate] | None = None
```

이렇게 하면 모델은 list를 만들더라도 각 item을 `title`, `date`, `start_time`, `attendees`를 가진 객체로 채워야 한다. 즉, list 전체의 타입뿐 아니라 list 안쪽 item의 schema까지 고정된다.

그래서 여러 일정이 나올 수 있는 요청에서는 `schedule: list[ScheduleCreate] | None`처럼 nested model을 쓰는 것이 더 안정적이다. 단순 list 출력보다 파싱 성공률이 높고, 후속 코드도 `for schedule in structured_response.schedule:`처럼 일정 객체를 하나씩 다루기 쉬워진다.

여러 개를 출력해야 한다고 해서 `ScheduleCreate` 안쪽 필드를 전부 list로 만드는 방식은 오히려 불안정할 수 있다.

```python
class ScheduleCreate(BaseModel):
    titles: list[str]
    dates: list[str]
    start_times: list[str]
    attendees: list[list[str]]
```

이런 구조는 겉보기에는 여러 일정을 담을 수 있어 보이지만, 실제로는 각 list의 같은 index끼리 하나의 일정이라는 규칙을 모델과 코드가 암묵적으로 맞춰야 한다.

예를 들어 모델이 다음처럼 출력하면 파싱은 될 수 있어도 데이터 의미가 깨진다.

```json
{
  "titles": ["회의", "점심 약속"],
  "dates": ["2026-04-24"],
  "start_times": ["15:00", "12:00"],
  "attendees": [["민수"], ["지영"]]
}
```

`titles`는 2개인데 `dates`는 1개다. Pydantic은 각 필드가 list인지까지는 검증하지만, 기본 설정만으로는 "모든 list의 길이가 같아야 한다"는 관계까지 자동으로 보장하지 않는다. 결국 후처리에서 index를 맞추다가 오류가 나거나, 어떤 날짜가 어떤 제목에 대응되는지 애매해진다.

반대로 `list[ScheduleCreate]`는 각 일정이 하나의 객체로 묶인다.

```json
{
  "schedule": [
    {
      "title": "회의",
      "date": "2026-04-24",
      "start_time": "15:00",
      "attendees": ["민수"]
    },
    {
      "title": "점심 약속",
      "date": "2026-04-25",
      "start_time": "12:00",
      "attendees": ["지영"]
    }
  ]
}
```

이 구조에서는 하나의 일정에 필요한 정보가 같은 객체 안에 붙어 있다. 그래서 모델도 "일정 객체를 여러 개 만들면 된다"고 이해하기 쉽고, 앱도 각 객체를 독립된 일정으로 저장하거나 렌더링하기 쉽다.

정리하면 여러 개의 structured output을 낼 때는 `object of lists`보다 `list of objects`가 보통 더 안정적이다. 여러 일정이면 `ScheduleCreate` 안에 list를 넣기보다, 상위 결과에서 `schedule: list[ScheduleCreate]`로 두는 편이 좋다.

## Field description은 필드별 프롬프트다

Pydantic의 `Field(description=...)`에는 데이터에 대한 설명을 적는다. 일반적인 API 서버에서는 이 설명이 문서화나 schema metadata에 가깝지만, LLM structured output에서는 모델이 그 필드를 어떻게 채워야 하는지 알려주는 프롬프트 역할도 한다.

예를 들어 다음 필드는 단순히 `date`가 문자열이라는 것만 말하지 않는다. `YYYY-MM-DD` 형식으로 날짜를 채우라는 지시까지 포함한다.

```python
date: str = Field(description="YYYY-MM-DD")
```

description에는 few-shot처럼 짧은 예시를 넣을 수도 있다.

```python
category: Literal["politics", "economy", "sports", "tech", "culture"] = Field(
    description="뉴스 기사 분야. 예: 'AI 반도체 수출 증가' -> tech, '금리 인하 가능성' -> economy"
)
```

이렇게 쓰면 입력에 직접 존재하지 않는 값도 모델이 추론해서 채울 수 있다. 예를 들어 뉴스 기사 제목에 `category`라는 단어가 없어도, 제목의 의미를 보고 분야를 만들어낼 수 있다.

```python
class NewsTitleAnalysis(BaseModel):
    title: str = Field(description="뉴스 기사 제목")
    category: Literal["politics", "economy", "sports", "tech", "culture"] = Field(
        description="기사 제목을 보고 가장 가까운 분야를 고른다. 예: '프로야구 개막전 매진' -> sports"
    )
```

입력:

```text
삼성전자, 차세대 AI 반도체 생산 확대
```

출력은 다음처럼 될 수 있다.

```json
{
  "title": "삼성전자, 차세대 AI 반도체 생산 확대",
  "category": "tech"
}
```

즉, `Field(description=...)`을 잘 쓰면 단순 추출뿐 아니라 분류, 정규화, 추론까지 structured output 안에서 처리할 수 있다. 다만 description이 길고 모호하면 오히려 실패 가능성이 늘어나므로, 필드별 역할과 예시는 짧고 명확하게 쓰는 것이 좋다.

## Tool input schema로 입력 정제하기

Structured output은 보통 모델의 최종 응답을 정해진 구조로 받는 방법이다. 비슷한 방식으로, `@tool`로 도구를 만들 때도 tool이 받을 input argument에 schema를 붙여 입력을 정제할 수 있다.

수업에서 말하는 `input_arg`는 이 tool 호출에 들어가는 입력 인자 schema라고 이해하면 된다. LangChain 코드에서는 보통 함수 인자의 type hint나 `args_schema`로 표현한다.

LangChain의 tool은 함수의 type hint, docstring, Pydantic schema 등을 보고 tool input schema를 만든다. 모델은 tool을 호출할 때 자연어를 그대로 넘기는 것이 아니라, schema에 맞는 arguments를 채워서 호출한다.

예를 들어 사용자가 "내일 오후 3시에 민수랑 회의 잡아줘"라고 말해도 tool에는 다음처럼 정제된 인자가 들어가게 만들 수 있다.

```python
from langchain.tools import tool
from pydantic import BaseModel, Field

class CreateScheduleInput(BaseModel):
    title: str = Field(description="일정 제목. 예: 회의, 점심 약속")
    date: str = Field(description="일정 날짜. YYYY-MM-DD 형식으로 변환")
    start_time: str = Field(description="시작 시간. HH:MM 형식")
    attendees: list[str] = Field(default_factory=list, description="참석자 이름 목록")

@tool(args_schema=CreateScheduleInput)
def create_schedule(title: str, date: str, start_time: str, attendees: list[str]) -> str:
    """일정을 생성한다."""
    return f"created: {title} {date} {start_time} {attendees}"
```

이 경우 모델은 tool을 호출할 때 대략 이런 arguments를 만든다.

```json
{
  "title": "회의",
  "date": "2026-04-24",
  "start_time": "15:00",
  "attendees": ["민수"]
}
```

여기서 중요한 점은 tool input schema도 일종의 structured output이라는 것이다. 다만 최종 답변을 구조화하는 것이 아니라, tool call에 들어갈 입력값을 구조화한다.

이 방식으로 할 수 있는 일은 다음과 같다.

- 자연어 입력에서 필요한 인자만 추출한다.
- 날짜, 시간, 카테고리 같은 값을 정해진 형식으로 정규화한다.
- enum이나 `Literal`로 허용 가능한 값만 고르게 한다.
- `Field(description=...)`에 예시를 넣어 모델이 더 좋은 tool argument를 만들게 한다.

다만 이것도 완전한 보장은 아니다. 모델이 잘못된 값을 넣을 수 있고, schema 검증에서 실패할 수 있다. 그래서 중요한 로직은 tool 함수 안에서 한 번 더 검증하거나, Pydantic validator로 최종 정제를 해두는 것이 좋다.

정리하면, structured response는 "모델의 최종 출력"을 정제하고, tool input schema는 "도구 실행 전 입력"을 정제한다. 둘 다 Pydantic class와 `Field(description=...)`을 활용해서 LLM의 자유로운 자연어를 프로그램이 다루기 좋은 데이터로 바꾸는 방법이다.

## 현재 LangChain 전략: ProviderStrategy와 ToolStrategy

앞에서 본 JSON/Pydantic output parser는 provider-native structured output이 없던 시기의 대표적인 프레임워크 해결책이다. 현재 LangChain은 여기서 더 나아가 provider-native 기능과 tool calling 전략을 함께 사용한다.

현재 LangChain의 structured output은 provider가 native structured output을 지원하면 ProviderStrategy를 쓰고, 그렇지 않으면 ToolStrategy로 fallback하는 식으로 정리되어 있다. 즉, 예전에는 프레임워크가 prompt/parser/retry로 구조화를 보완했다면, 지금은 provider-native 기능과 프레임워크의 tool calling 전략을 함께 사용한다.

조금 더 정확히 쓰면, LangChain에 Pydantic class 같은 schema type을 넘겼을 때 우선순위는 다음과 같다.

1. LLM provider가 native structured output을 지원하면 `ProviderStrategy`를 쓴다.
2. provider-native structured output이 없지만 tool/function calling을 지원하면 `ToolStrategy`를 쓴다.
3. 둘 다 어렵다면 예전 방식처럼 prompt instruction과 output parser를 이용해 문자열을 파싱한다.

`ProviderStrategy`는 OpenAI Structured Outputs처럼 LLM provider의 API 기능을 직접 쓰는 방식이다. 이 경우 schema 준수는 provider 쪽에서 강하게 보장한다.

`ToolStrategy`는 LangChain이 Pydantic class를 tool/function schema처럼 바꿔서 모델에게 tool call arguments를 채우게 하는 방식이다. 모델은 자연어 문장을 출력하는 대신 `ContactInfo(name=..., email=...)`에 해당하는 인자들을 채우고, LangChain은 그 결과를 다시 Pydantic class로 검증해서 `structured_response`에 넣는다.

그래서 ToolStrategy는 단순히 문자열을 JSON으로 파싱하는 것보다 안정적이지만, provider-native structured output보다는 프레임워크 레벨의 우회 전략에 가깝다. 오류가 나면 LangChain이 validation error를 모델에게 돌려주고 다시 시도하게 만들 수 있다.

## 파싱 실패의 신호: 대기시간 증가

Structured output을 사용할 때 대기시간이 평소보다 많이 증가하면 파싱에 실패하고 있을 가능성을 의심할 수 있다.

LangChain을 쓰는 경우에는 모델 출력이 schema에 맞지 않아 validation error가 나고, LangChain이 오류 메시지를 다시 모델에게 전달해서 재시도하는 과정이 반복될 수 있다. 겉으로는 한 번의 요청처럼 보이지만 내부적으로는 parse 실패와 retry가 일어나기 때문에 latency가 늘어난다.

LLM provider 자체의 structured output을 쓰는 경우에도 schema가 너무 복잡하거나 모델이 제약을 맞추기 어려우면 응답 생성 시간이 늘어날 수 있다. 즉, LangChain을 쓰든 provider-native 기능을 쓰든 대기시간 증가는 구조화 출력이 잘 안 맞고 있다는 운영상 신호가 될 수 있다.

이럴 때는 두 가지를 점검한다.

- provider 또는 model을 바꾼다. structured output을 더 잘 지원하는 모델을 쓰면 해결될 수 있다.
- prompt 또는 schema를 바꾼다. 필드를 줄이거나, description을 명확히 하거나, optional처럼 보이는 값은 `null`을 허용하도록 schema를 단순화한다.

## 정리

few-shot prompting은 "예시를 보고 따라 하게 하는 방법"이다.
JSON mode는 "유효한 JSON을 만들게 하는 방법"이다.
Pydantic parser는 "나온 JSON이 타입에 맞는지 검증하는 방법"이다.
LangChain의 `response_format`은 기존 Pydantic `BaseModel` class를 structured response schema로 재사용하는 방법이다.
OpenAI Structured Outputs는 "모델 출력 자체가 schema를 따르도록 provider API 차원에서 강제하는 방법"이다.

이 흐름은 LLM을 텍스트 생성기에서 애플리케이션이 신뢰할 수 있는 데이터 생성기로 바꾸기 위한 발전 과정으로 볼 수 있다.
