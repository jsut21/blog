# pdf 파일 구조

- **Header**: PDF 버전 정보 (예: `%PDF-1.7`)를 담고 있다.
- **Body**: 실제 콘텐츠가 들어있는 부분. 텍스트, 이미지, 폰트, 벡터 그래픽 등이 '객체(Object)' 단위로 저장된다. <mark style="background:#d4b106">객체 간의 순서는 중요하지 않다.</mark>
- **Xref Table (Cross-reference Table)**: 파일 내<mark style="background:#d4b106"> 각 객체들이 어느 위치(바이트 오프셋)에 있는지 기록</mark>한 인덱스. 라이브러리가 특정 페이지나 이미지를 즉시 찾을 수 있게 해준다.
- **Trailer**: <mark style="background:#d4b106">파일의 끝을 알리며, Xref Table의 시작 위치와 파일의 루트 객체(Catalog)를 가리킨다</mark>.


## pdf 파일 구조 이미지
<p align="center"> <img src="https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FbwzPiJ%2FbtrFFnByVH4%2FAAAAAAAAAAAAAAAAAAAAAH2Lc1gxbllFcU-3wx_DNrQRnG1dTL2W-ppGks9ttCbe%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1772290799%26allow_ip%3D%26allow_referer%3D%26signature%3D9HEoY%252FxSKGnfxSTBTgeC1gqjsts%253D" width="200"> </p>
<p align="center"> <img src="https://skia.org/docs/dev/design/PdfLogicalDocumentStructure.png" width="400"> </p>

## PDF 파일 구조 예시
``` plaintext
%PDF-1.4 (Header: PDF 버전 정보)

1 0 obj (Body: Catalog 객체 - 전체 문서의 루트)
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj

2 0 obj (Body: Pages 객체 - 페이지 트리)
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj

3 0 obj (Body: Page 객체 - 개별 페이지 정보)
<<
  /Type /Page
  /Parent 2 0 R
  /Resources << >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj

4 0 obj (Body: Stream 객체 - 실제 페이지에 그려질 내용)
<< /Length 44 >>
stream
BT
/F1 12 Tf
70 700 Td
(Hello, PDF World!) Tj
ET
endstream
endobj

xref (Xref Table: 각 객체의 바이트 오프셋 위치)
0 5
0000000000 65535 f 
0000000015 00000 n (1번 객체 위치)
0000000060 00000 n (2번 객체 위치)
0000000120 00000 n (3번 객체 위치)
0000000230 00000 n (4번 객체 위치)

trailer (Trailer: 루트 객체 지정 및 Xref 시작점)
<<
  /Size 5
  /Root 1 0 R
>>
startxref
320
％％EOF (% 그대로 하면 현재 페이지 코드블럭이 이상하게 보여서 ％(Fullwidth Percent Sign, U+FF05)으로 대체해서 나타냄)
```

### 각 부분에 대한 설명

- **Header**: `%PDF-1.4`는 이 파일이 PDF 1.4 규격을 따름을 의미.
- **Body**: `1 0 obj`부터 `4 0 obj`까지가 실제 데이터.
    - `1 0 obj`: 문서의 시작점인 Catalog.
    - `3 0 obj`: 페이지의 크기(`MediaBox`)와 내용(`Contents`)을 정의.
    - `4 0 obj`: `stream` 내부에 실제 텍스트인 "Hello, PDF World!"를 출력하는 명령어가 들어있다.
- **Xref Table**: 각 객체(1번~4번)가 파일의 몇 번째 바이트에 위치하는지 기록하여 빠른 접근을 돕는다.
	-  엔트리 포멧 : `nnnnnnnnnn ggggg n eol` 
		- nnnnnnnnnn은 문서 시작 부분부터 시작하는 오브젝트의 10자리 바이트 오프셋
		- ggggg는 5자리 세대 숫자이며, 현재 오브젝트가 어떤 세대인지 나타낸다. 오브젝트가 삭제된 다음 재사용 될 때마다 새로운 세대 번호가 부여된다.
		- n은 사용 중, f는 free(not used)를 나타낸다.
		- Unix EOL 포맷의 경우 `<space><linefeed>`, Windows EOL 포맷의 경우 `<carriage return><linefeed>`
- **Trailer**: `/Root 1 0 R`을 통해 1번 객체가 루트임을 알려주고, `startxref` 뒤의 숫자(320)는 `xref` 테이블이 시작되는 위치를 가리킨다. `％％EOF` 는 파일의 끝을 의미. (객체번호 세대번호 R 순서이며 R은 참조를 나타냄.)

###  Xref Table이 여러 개일 때 어떻게 읽나요?

PDF를 수정하면 파일 뒷부분에 새로운 `xref` 테이블이 추가된다. 하지만 단순히 순서대로 읽는 것이 아니라 <mark style="background:#d4b106">**'역순 연결 리스트'** 구조</mark>를 가진다.
#### `/Prev` 키워드의 등장

새로운 `xref` 테이블 뒤에 오는 **새로운 `trailer`에는 이전 `xref` 테이블의 위치를 가리키는 `/Prev`라는 항목이 추가**된다.

<p align="center"> <img src="https://www.drumlinsecurity.com/wiki/images/2/27/Tip3-2.jpg" width="400"> </p>

1. **Original Body & Xref** (최초 저장)
2. **New Body** (수정된 내용)
3. **New Xref Table** (수정된 객체들의 새 위치)
4. **New Trailer** (여기에 `/Prev [예전 startxref 위치]`가 들어감)
5. **New startxref** (가장 최신 xref 위치)
6. **%%EOF**

## PDF object types

- **bools**: `true` `false`
- **ints**: `42` `0` `-1`
- **scalars**: `0.001`
- **strings**: `(strings are in parentheses or byte encoded)` `<74657374>`
- **name**: `/Name` `/Name#20with#20spaces`
- **array**: `[/Foo 42 (arrays can contain multiple types)]`
- **dictionary**: `<</Key1 (value1) /key2 42>>`
- **indirect object**:  
    `5 0 obj (An indirect string. Indirect objects have an object number and a generation number, Skia always uses generation 0 objects) endobj`
- **object reference**: `5 0 R`
- **stream**: `<</Length 56>> stream ...stream contents can be arbitrary, including binary... endstream`
## pdf 파일 읽기

**Body에 들어가는 객체(Object)들의 순서는 정해져 있지 않다.** 1번 객체가 반드시 루트(Catalog)일 필요도 없고, 페이지 순서대로 객체가 나열될 필요도 없다.

그 이유는 PDF의 **Xref Table(교차 참조 테이블)** 구조 때문이다.

1. 가장 마지막의 `startxref`를 읽어 **최신 지도(New Xref)**를 먼저 본다.
2. 최신 `trailer`에 있는 **`/Prev`** 값을 보고 **이전 지도(Old Xref)**의 위치로 거슬러 올라간다.
3. 이렇게 거슬러 올라가며 모든 지도를 합쳐서 하나의 완벽한 '최신 지도'를 완성.

<mark style="background:#d4b106">-> **찾아가는 과정**: Trailer → Root ID 확인(예: `/Root 1 0 R`) → Xref Table에서 위치 확인 → Body의 해당 위치로 점프.</mark>

### 만약 같은 객체 번호가 여러 곳에 있다면?

- 리더기는 **가장 나중에 추가된(가장 뒤에 있는) 정보**를 우선시.
- 이 방식을 통해 기존 데이터를 지우지 않고도 내용을 수정하거나 삭제(객체 위치를 0으로 표시)할 수 있다.

## 참고 자료
[참고 블로그](https://tmxhsk99.tistory.com/221)
<br>
[PDF Theory of Operation](https://skia.org/docs/dev/design/pdftheory/)