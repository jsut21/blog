---
title: Transformer Explainer
created: 2026-07-07
draft: false
commit: false
tags:
  - llm/transformer
  - ai/visualization
---

## 수업 자료

- [Transformer Explainer](https://poloclub.github.io/transformer-explainer/)

Transformer Explainer는 GPT-2 small 모델을 브라우저에서 직접 실행하면서 Transformer 내부 동작을 시각적으로 보여주는 사이트다. 입력 문장이 토큰으로 나뉘고, embedding을 거쳐 Transformer block을 통과한 뒤, 다음 token probability로 바뀌는 과정을 단계별로 확인할 수 있다.

이 수업에서는 Transformer를 수식으로만 이해하기보다, 실제 입력이 모델 내부에서 어떤 형태로 변환되는지 따라가면서 이해하는 것이 목표다.

## 전체 흐름

텍스트 생성 Transformer는 기본적으로 다음 token을 예측하는 모델이다.

```text
입력 문장
-> tokenization
-> token embedding + positional encoding
-> Transformer block 반복
-> output logits
-> softmax probability
-> sampling
-> 다음 token 생성
```

Transformer Explainer 사이트도 이 흐름을 따라 구성되어 있다.

1. 입력 prompt를 넣는다.
2. prompt가 token 단위로 쪼개진다.
3. 각 token이 embedding vector로 바뀐다.
4. 위치 정보가 더해진다.
5. 여러 Transformer block을 지나며 token representation이 바뀐다.
6. 마지막 representation이 vocabulary 전체에 대한 logit으로 변환된다.
7. softmax를 거쳐 다음 token 확률이 나온다.
8. temperature, top-k, top-p 같은 sampling 설정에 따라 실제 다음 token이 선택된다.

## 핵심 관찰 포인트

### 1. Tokenization

LLM은 문장을 그대로 읽지 않고 token 단위로 처리한다. token은 단어일 수도 있고, 단어보다 작은 subword일 수도 있다.

예를 들어 하나의 영어 단어가 항상 하나의 token이 되는 것은 아니다. 자주 쓰이는 단어는 하나의 token이 될 수 있지만, 덜 흔한 단어는 여러 token으로 쪼개질 수 있다.

중요한 점은 모델의 입력 단위가 사람이 보는 단어가 아니라 token이라는 것이다. 따라서 모델이 "다음 단어"를 예측한다고 말할 때 실제로는 다음 token을 예측하는 경우가 많다.

### 2. Embedding

Token은 먼저 숫자 ID로 바뀌고, 그 ID에 해당하는 embedding vector를 찾는다. GPT-2 small 기준으로 각 token은 768차원 vector로 표현된다.

embedding은 token의 의미나 사용 맥락을 담는 숫자 표현이다. 모델은 문자열 자체를 계산하는 것이 아니라, 이 vector를 계산한다.

여기에 positional encoding이 더해진다. 같은 token이라도 문장 안에서 어느 위치에 있는지에 따라 역할이 달라질 수 있기 때문에, Transformer는 token 정보와 위치 정보를 함께 사용한다.

#### Embedding 기술의 발전 흐름

Transformer의 embedding을 이해하려면 이전 방식과 비교해서 보는 것이 좋다.

```text
one-hot encoding
-> Word2Vec / GloVe 같은 static word embedding
-> ELMo 같은 contextual embedding
-> Transformer의 contextual token representation
```

##### One-hot encoding

가장 단순한 방식은 단어를 one-hot vector로 표현하는 것이다. vocabulary 크기가 10,000이면 각 단어는 10,000차원 vector가 되고, 자기 위치만 1이고 나머지는 0이다.

```text
cat = [0, 0, 1, 0, 0, ...]
dog = [0, 0, 0, 1, 0, ...]
```

장점은 단순하고 명확하다는 것이다. 하지만 치명적인 단점이 있다.

- vocabulary가 커질수록 vector가 너무 커진다.
- 대부분의 값이 0이라 비효율적이다.
- 단어 사이의 의미적 유사도를 표현하지 못한다.

one-hot에서 `cat`과 `dog`는 의미적으로 가깝지만 vector 관점에서는 전혀 가깝지 않다.

##### Word2Vec

Word2Vec은 단어를 dense vector로 학습하는 대표적인 방식이다. 핵심 아이디어는 비슷한 문맥에 등장하는 단어는 비슷한 의미를 가진다는 것이다.

Word2Vec은 크게 두 방식으로 설명된다.

- CBOW: 주변 단어를 보고 가운데 단어를 예측한다.
- Skip-gram: 가운데 단어를 보고 주변 단어를 예측한다.

##### CBOW

CBOW는 Continuous Bag of Words의 약자다. 주변 단어들을 입력으로 넣고, 가운데 단어를 맞히도록 학습한다.

예를 들어 문장이 다음과 같다고 하자.

```text
the cat sat on the mat
```

가운데 단어를 `sat`으로 잡고 window size를 2로 두면 주변 단어는 다음과 같다.

```text
입력: the, cat, on, the
정답: sat
```

모델은 주변 단어들의 embedding을 평균내거나 합친 뒤, 가운데 단어가 무엇인지 예측한다.

```text
context words
-> embeddings
-> average
-> predict center word
```

CBOW의 직관은 "주변 문맥을 보면 빠진 단어를 맞힐 수 있다"는 것이다.

장점:

- 여러 주변 단어를 평균내기 때문에 학습이 비교적 안정적이다.
- 자주 등장하는 단어에 대해 빠르고 효율적으로 학습된다.
- 계산량이 Skip-gram보다 적은 편이다.

단점:

- 희귀 단어의 세밀한 의미를 학습하는 데는 상대적으로 약할 수 있다.
- 주변 단어를 bag처럼 합치므로 단어 순서 정보는 거의 반영하지 않는다.

##### Skip-gram

Skip-gram은 CBOW와 반대 방향이다. 가운데 단어를 입력으로 넣고, 주변 단어들을 맞히도록 학습한다.

같은 예시에서 가운데 단어가 `sat`이면 다음처럼 학습한다.

```text
입력: sat
정답: the, cat, on, the
```

즉 하나의 center word로 여러 context word를 예측한다.

```text
center word
-> embedding
-> predict surrounding words
```

Skip-gram의 직관은 "이 단어가 등장했다면 주변에 어떤 단어들이 올 가능성이 높은가"를 학습하는 것이다.

장점:

- 희귀 단어의 의미를 더 잘 학습하는 경향이 있다.
- 하나의 단어가 여러 주변 단어를 예측하므로 더 많은 학습 signal을 얻을 수 있다.
- 의미적 유사도 표현에 강한 편이다.

단점:

- CBOW보다 학습이 느릴 수 있다.
- vocabulary가 크면 모든 단어에 대한 softmax 계산이 비싸다. 그래서 negative sampling 같은 최적화가 자주 사용된다.

##### CBOW와 Skip-gram 비교

| 방식 | 입력 | 예측 대상 | 강점 | 약점 |
| --- | --- | --- | --- | --- |
| CBOW | 주변 단어들 | 가운데 단어 | 빠르고 안정적 | 희귀 단어 표현이 약할 수 있음 |
| Skip-gram | 가운데 단어 | 주변 단어들 | 희귀 단어와 의미 관계에 강함 | 학습이 상대적으로 느림 |

두 방식 모두 학습 목표 자체는 단어 예측이지만, 최종적으로 얻고 싶은 것은 예측 모델이 아니라 그 과정에서 학습된 embedding matrix다. 학습이 끝나면 각 단어에 해당하는 vector를 꺼내 다른 NLP 모델의 입력 feature로 사용할 수 있다.

이런 학습을 거치면 단어마다 고정된 embedding vector가 생긴다.

```text
king - man + woman ≈ queen
```

같은 vector 연산이 가능하다는 점이 Word2Vec의 유명한 특징이다.

장점:

- one-hot보다 훨씬 작은 dense vector를 사용한다.
- 단어 사이의 의미적 유사도를 어느 정도 담을 수 있다.
- 사전에 학습된 embedding을 다른 모델에 가져다 쓸 수 있다.

단점:

- 한 단어가 항상 하나의 vector를 가진다.
- 문맥에 따라 의미가 달라지는 다의어를 잘 처리하지 못한다.
- out-of-vocabulary 문제가 있다. vocabulary에 없는 단어는 embedding을 바로 찾을 수 없다.

예를 들어 `bank`는 "은행"일 수도 있고 "강둑"일 수도 있지만, Word2Vec에서는 보통 하나의 `bank` vector만 가진다.

##### GloVe

GloVe도 static word embedding 방식이다. Word2Vec이 주변 단어 예측 task를 통해 학습한다면, GloVe는 corpus 전체의 단어 동시 등장 통계를 이용해서 embedding을 학습한다.

장점과 단점은 Word2Vec과 비슷하다. 의미적 유사도를 잘 담는 dense vector를 만들 수 있지만, 여전히 한 단어에 하나의 고정 vector를 주는 static embedding이라는 한계가 있다.

##### Transformer embedding과의 차이

Transformer에서도 처음에는 token embedding table을 사용한다는 점에서 Word2Vec과 비슷해 보인다. token ID를 넣으면 고정된 embedding vector를 lookup한다.

하지만 중요한 차이는 이 embedding이 그대로 최종 의미 표현이 아니라는 점이다. Transformer에서는 token embedding에 position 정보를 더한 뒤, 여러 Transformer block을 지나면서 문맥에 따라 representation이 계속 바뀐다.

예를 들어 `bank`라는 token의 초기 embedding은 같을 수 있다. 하지만 문장 전체를 attention으로 처리한 뒤에는 두 문장에서 다른 representation이 된다.

```text
I deposited money at the bank.
The boat stopped near the river bank.
```

초기 token embedding은 같아도, Transformer block을 통과한 뒤의 `bank` representation은 주변 token을 반영하기 때문에 달라진다. 이것을 contextual representation이라고 볼 수 있다.

##### 비교 정리

| 방식 | vector가 정해지는 방식 | 문맥 반영 | 장점 | 단점 |
| --- | --- | --- | --- | --- |
| One-hot | 단어 ID 위치만 1 | 없음 | 단순함 | 차원이 크고 의미 유사도 없음 |
| Word2Vec | 주변 단어 예측으로 학습 | 없음 | dense vector, 의미 유사도 표현 | 다의어/OOV에 약함 |
| GloVe | 단어 동시 등장 통계로 학습 | 없음 | corpus 통계 반영 | 여전히 static embedding |
| Transformer | token embedding lookup 후 attention/MLP로 갱신 | 있음 | 문맥별 representation 가능 | 계산량이 크고 구조가 복잡함 |

정리하면 Word2Vec/GloVe는 단어마다 하나의 고정된 의미 vector를 잘 만드는 방식이고, Transformer는 token의 초기 embedding을 출발점으로 삼아 문맥에 따라 representation을 계속 바꾸는 방식이다.

#### Embedding layer는 실제로 어떻게 구현되는가

먼저 중요한 점은 텍스트 문자열 자체에 matrix를 곱해서 embedding을 만드는 것이 아니라는 것이다.

```text
"hello" x W -> embedding
```

이런 방식이 아니다. 실제 흐름은 다음에 가깝다.

```text
raw text
-> tokenizer
-> token ids
-> embedding table lookup
-> token vectors
```

즉, 텍스트가 바로 숫자 vector로 변하는 것이 아니라 tokenizer가 먼저 텍스트를 vocabulary에 있는 token들의 ID sequence로 바꾼다.

```text
"Hello world"
-> [15496, 995]
-> embedding_table[15496], embedding_table[995]
```

여기서 `15496`, `995`는 단순한 정수 index다. embedding layer는 이 정수 index로 embedding table의 row를 가져온다.

#### 처음 보는 단어는 어떻게 처리되는가

처음 보는 단어가 들어와도 모델이 바로 실패하지 않는 이유는 tokenizer가 단어 단위가 아니라 subword 또는 byte-level 단위로 쪼갤 수 있기 때문이다.

예를 들어 vocabulary에 `unbelievable`이라는 완성 단어 token이 없더라도 tokenizer는 이를 더 작은 조각으로 나눌 수 있다.

```text
"unbelievable"
-> ["un", "believ", "able"]
-> [token_id_1, token_id_2, token_id_3]
```

실제 GPT-2 계열 tokenizer는 byte-level BPE를 사용한다. 그래서 거의 모든 문자열을 vocabulary 안의 token 조합으로 표현할 수 있다. 처음 보는 신조어, 오타, 이름, URL도 보통 여러 token으로 쪼개져 들어간다.

```text
"lisGPTaku"
-> ["lis", "G", "PT", "aku"]  # 예시
```

각 조각은 이미 vocabulary에 있는 token이므로 embedding table에 row가 있다. 모델은 처음 보는 전체 단어를 하나의 새 embedding으로 만드는 것이 아니라, 이미 학습된 subword token embedding들의 sequence로 처리한다.

중요한 차이는 다음과 같다.

- known token: vocabulary에 있는 token ID 하나로 변환된다.
- unknown word: vocabulary에 있는 여러 subword/byte token ID로 분해된다.
- 진짜 새로운 token ID: embedding table에 row가 없으므로 모델이 처리할 수 없다.

그래서 tokenizer vocabulary를 바꾸면 embedding table 크기도 같이 바꿔야 한다. 새 token을 추가하면 그 token에 해당하는 embedding row를 새로 초기화하고, fine-tuning으로 학습시켜야 한다.

#### 곱셈이라기보다는 lookup이다

개념적으로는 one-hot vector와 embedding matrix를 곱하는 것처럼 설명할 수 있다.

```text
one_hot(token_id) @ embedding_matrix
```

하지만 실제 구현에서는 거대한 one-hot vector를 만들지 않는다. token ID를 index로 사용해서 embedding matrix의 row를 바로 가져온다.

```python
embedding_vector = embedding_table[token_id]
```

따라서 embedding layer는 선형층처럼 dense vector에 `W`를 곱하는 연산이라기보다, 정수 token ID를 받아 해당 row를 꺼내는 lookup 연산에 가깝다. 물론 이 lookup table 자체는 학습 가능한 weight matrix다.

Transformer의 embedding layer는 보통 거대한 lookup table이다.

```python
token_embedding = nn.Embedding(vocab_size, d_model)
```

GPT-2 small 기준으로 보면 대략 다음과 같은 matrix가 있다.

```text
token_embedding.weight: [vocab_size, d_model]
                        [50257, 768]
```

각 token ID는 이 matrix의 row index로 쓰인다. 예를 들어 token ID가 `15496`이면 embedding matrix의 15496번째 row를 가져온다.

```python
input_ids = tokenizer("Hello world")
# 예: [15496, 995]

token_vectors = token_embedding(input_ids)
# shape: [seq_len, d_model]
```

즉, embedding은 처음부터 사람이 정한 의미 vector가 아니라, 학습 가능한 parameter table이다. 학습 중에는 다른 weight들과 마찬가지로 backpropagation을 통해 이 table의 값도 같이 업데이트된다.

```text
loss
-> gradient 계산
-> attention/MLP weight 업데이트
-> embedding table row들도 업데이트
```

그래서 "임베딩을 쓴다"는 말은 보통 두 경우로 나뉜다.

- 모델을 처음부터 pretraining한다면 embedding table도 같이 학습한다.
- pretrained model을 가져다 쓴다면 이미 학습된 embedding table을 불러온다.

fine-tuning을 할 때는 설정에 따라 embedding까지 같이 업데이트할 수도 있고, freeze해서 고정할 수도 있다.

#### Position embedding까지 더한 값이 block 입력이 된다

Token embedding만 있으면 같은 token은 어디에 있든 같은 vector를 갖는다. 하지만 문장에서는 위치가 중요하므로 position embedding을 더한다.

GPT-2는 learned absolute positional embedding을 사용한다. 이것도 token embedding처럼 학습되는 parameter table이다.

```python
token_embedding = nn.Embedding(vocab_size, d_model)
position_embedding = nn.Embedding(max_seq_len, d_model)

token_vecs = token_embedding(input_ids)        # [batch, seq_len, d_model]
position_ids = torch.arange(seq_len)
position_vecs = position_embedding(position_ids)  # [seq_len, d_model]

x = token_vecs + position_vecs
```

이 `x`가 첫 번째 Transformer block으로 들어간다.

```text
input_ids
-> token embedding lookup
-> position embedding lookup
-> 두 vector를 더함
-> Transformer block 입력
```

원래 Transformer 논문에서는 sinusoidal positional encoding처럼 고정된 위치 encoding도 사용했다. GPT-2는 위치 embedding을 학습한다. 최근 모델들은 RoPE처럼 position vector를 직접 더하지 않고 attention 계산 안에서 위치 정보를 반영하는 방식도 많이 쓴다.

#### 출력층과 embedding을 공유하기도 한다

언어 모델은 마지막에 hidden state를 vocabulary 크기의 logit으로 바꾼다.

```python
logits = hidden @ output_embedding.T
```

이때 입력 token embedding matrix와 출력 projection matrix를 공유하는 경우가 많다. 이를 weight tying이라고 한다. 같은 token table을 입력에서는 "token ID를 vector로 바꾸는 용도"로 쓰고, 출력에서는 "hidden state와 각 token vector의 유사도를 계산해 다음 token 점수를 만드는 용도"로 다시 쓰는 것이다.

정리하면 embedding layer는 단순한 전처리 함수가 아니라 모델 parameter의 일부다. token ID를 vector로 바꾸는 lookup table이고, pretraining 과정에서 의미 있는 위치로 조정된다.

### 3. Transformer Block

Transformer block은 입력 representation을 계속 변환하는 핵심 구조다. GPT-2 small에는 이런 block이 12개 있다.

각 block은 크게 두 부분으로 볼 수 있다.

- Multi-head self-attention
- MLP layer

attention은 token들 사이에서 어떤 정보를 서로 참고할지 결정한다. MLP는 각 token representation을 독립적으로 변환하면서 더 복잡한 특징을 만들도록 돕는다.

### 4. Self-Attention

self-attention은 각 token이 다른 token을 얼마나 참고할지 계산하는 과정이다.

사이트에서는 Query, Key, Value를 검색에 비유한다.

- Query: 지금 정보를 찾고 싶은 token의 질문
- Key: 비교 대상 token들이 가진 검색용 표지
- Value: 실제로 가져올 정보

Query와 Key의 유사도를 계산하면 attention score가 나온다. 이 score를 softmax로 확률처럼 바꾸고, 그 가중치로 Value를 섞으면 attention output이 된다.

GPT 계열의 텍스트 생성 모델에서는 masked self-attention을 사용한다. 현재 token이 미래 token을 보면 안 되기 때문에, attention matrix의 미래 방향을 mask로 막는다. 이것이 next-token prediction을 가능하게 하는 중요한 제약이다.

### 5. Multi-Head Attention

하나의 attention만 쓰는 것이 아니라 여러 attention head를 동시에 사용한다. GPT-2 small은 12개의 attention head를 사용한다.

각 head는 서로 다른 관점에서 token 관계를 볼 수 있다. 어떤 head는 가까운 문법 관계를 볼 수 있고, 어떤 head는 더 넓은 의미 관계를 볼 수 있다.

여러 head의 결과는 다시 합쳐져 다음 layer로 전달된다.

### 6. MLP Layer

Attention이 token 사이의 정보를 섞는 역할이라면, MLP는 각 token의 representation을 개별적으로 변환하는 역할이다.

GPT-2 small에서는 768차원 representation을 더 큰 차원으로 확장했다가 다시 768차원으로 줄인다. 이 과정에서 GELU 같은 activation function이 들어가며, 단순 선형 변환보다 더 복잡한 특징을 만들 수 있게 된다.

### 7. Output Probability

마지막 Transformer block을 지난 representation은 vocabulary 전체에 대한 logit으로 바뀐다. GPT-2의 vocabulary에는 50,257개의 token이 있으므로, 다음 token 후보마다 하나의 점수가 생긴다.

softmax는 이 logit들을 확률 분포로 바꾼다. 그 다음 sampling 설정에 따라 실제로 생성할 token이 선택된다.

## Sampling 설정

### Temperature

temperature는 확률 분포의 날카로움을 조절한다.

- temperature가 낮으면 높은 확률 token에 더 몰리므로 출력이 더 결정적이다.
- temperature가 높으면 낮은 확률 token도 선택될 가능성이 커져 출력이 더 다양해진다.

### Top-k와 Top-p

top-k는 확률이 높은 상위 k개 token만 후보로 남긴다.

top-p는 누적 확률이 p를 넘을 때까지의 token 집합만 후보로 남긴다.

둘 다 모델의 다음 token 선택 범위를 제한해서 너무 이상한 token이 나오는 것을 줄이는 방법이다.

## 정리

Transformer Explainer를 볼 때 핵심은 "문장이 모델 안에서 점점 다른 숫자 표현으로 바뀌고, 마지막에는 다음 token 확률로 바뀐다"는 흐름을 잡는 것이다.

Transformer는 문장을 한 번에 이해하는 것처럼 보이지만, 내부적으로는 token embedding, attention, MLP, logits, sampling이라는 계산 단계를 거쳐 다음 token을 하나씩 만든다.
