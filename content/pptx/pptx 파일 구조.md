---
created: 2026-02-14
draft: false
---
# pptx 파일 구조

PPTX 파일은 Microsoft Office Open XML(OOXML) 형식을 따르며, 실제로는 여러 개의 XML 파일과 이미지, 미디어 파일들이 폴더 구조로 저장된 후 ZIP으로 압축된 형태이다.

구글에 pptx example을 검색했을 때 나오는 다음 pptx를 대상으로 pptx 파일 구조를 알아보자.  
[pptx example - Dickinson_Sample_Slides](https://www.dickinson.edu/downloads/download/520/sample_powerpoint_slides)

## 최상위 구조
압축을 풀었을 때 나타나는 주요 폴더와 파일은 다음과 같다.

- **`[Content_Types].xml`**: <mark style="background:#d4b106">파일 내에 포함된 모든 콘텐츠 종류(MIME 타입)를 정의</mark>. 어떤 XML이 슬라이드인지, 어떤 파일이 이미지인지 등을 명시.
- **`_rels/`**:<mark style="background:#d4b106"> 파일 간의 관계를 정의</mark>하는 `.rels` 파일이 들어있다.
- **`docProps/`**: 문서의 <mark style="background:#d4b106">속성 정보</mark>.
    - `core.xml`: 작성자, 수정일, 제목 등 기본 메타데이터.
    - `app.xml`: 슬라이드 개수, 단어 수, 프로그램 버전 등 통계 정보.
- **`ppt/`**: 프레임워크의 <mark style="background:#d4b106">핵심 데이터가 들어있는 가장 중요한 폴더.</mark>


### 예시
<div style="text-align: center;">
	<p>파일 확장자 변경</p>
	<img src="Pasted image 20260214173538.png" style="max-width: 30%; height: auto;">
</div>

<div style="display: flex; gap: 16px;">
  <div style="flex: 1; text-align: center;">
    <p>Before</p>
    <img src="Pasted image 20260214173510.png" style="max-width: 100%; height: auto;">
  </div>
  <div style="flex: 1; text-align: center;">
    <p>After</p>
    <img src="Pasted image 20260214173610.png" style="max-width: 100%; height: auto;">
  </div>
</div>

<div style="text-align: center;">
	<p>결과</p>
	<img src="Pasted%20image%2020260214171141.png" style="max-width: 100%; height: auto;">
</div>

#### 전체 파일 구조
``` bash
lis@lis-M5-PLUS:~/Downloads/Dickinson_Sample_Slides$ tree
.
├── [Content_Types].xml
├── docProps
│   ├── app.xml
│   └── core.xml
├── ppt
│   ├── charts
│   │   ├── chart1.xml
│   │   └── _rels
│   │       └── chart1.xml.rels
│   ├── drawings
│   │   └── drawing1.xml
│   ├── embeddings
│   │   └── Microsoft_Office_Excel_Worksheet1.xlsx
│   ├── media
│   │   ├── image1.png
│   │   ├── image2.emf
│   │   ├── image3.emf
│   │   └── image4.jpeg
│   ├── notesMasters
│   │   ├── notesMaster1.xml
│   │   └── _rels
│   │       └── notesMaster1.xml.rels
│   ├── notesSlides
│   │   ├── notesSlide1.xml
│   │   ├── notesSlide2.xml
│   │   ├── notesSlide3.xml
│   │   └── _rels
│   │       ├── notesSlide1.xml.rels
│   │       ├── notesSlide2.xml.rels
│   │       └── notesSlide3.xml.rels
│   ├── presentation.xml
│   ├── presProps.xml
│   ├── _rels
│   │   └── presentation.xml.rels
│   ├── slideLayouts
│   │   ├── _rels
│   │   │   ├── slideLayout10.xml.rels
│   │   │   ├── slideLayout1.xml.rels
│   │   │   ├── slideLayout2.xml.rels
│   │   │   ├── slideLayout3.xml.rels
│   │   │   ├── slideLayout4.xml.rels
│   │   │   ├── slideLayout5.xml.rels
│   │   │   ├── slideLayout6.xml.rels
│   │   │   ├── slideLayout7.xml.rels
│   │   │   ├── slideLayout8.xml.rels
│   │   │   └── slideLayout9.xml.rels
│   │   ├── slideLayout10.xml
│   │   ├── slideLayout1.xml
│   │   ├── slideLayout2.xml
│   │   ├── slideLayout3.xml
│   │   ├── slideLayout4.xml
│   │   ├── slideLayout5.xml
│   │   ├── slideLayout6.xml
│   │   ├── slideLayout7.xml
│   │   ├── slideLayout8.xml
│   │   └── slideLayout9.xml
│   ├── slideMasters
│   │   ├── _rels
│   │   │   └── slideMaster1.xml.rels
│   │   └── slideMaster1.xml
│   ├── slides
│   │   ├── _rels
│   │   │   ├── slide1.xml.rels
│   │   │   ├── slide2.xml.rels
│   │   │   ├── slide3.xml.rels
│   │   │   ├── slide4.xml.rels
│   │   │   ├── slide5.xml.rels
│   │   │   ├── slide6.xml.rels
│   │   │   ├── slide7.xml.rels
│   │   │   ├── slide8.xml.rels
│   │   │   └── slide9.xml.rels
│   │   ├── slide1.xml
│   │   ├── slide2.xml
│   │   ├── slide3.xml
│   │   ├── slide4.xml
│   │   ├── slide5.xml
│   │   ├── slide6.xml
│   │   ├── slide7.xml
│   │   ├── slide8.xml
│   │   └── slide9.xml
│   ├── tableStyles.xml
│   ├── theme
│   │   ├── theme1.xml
│   │   └── theme2.xml
│   └── viewProps.xml
└── _rels

21 directories, 66 files
```

## \[Content_Types].xml - 파일 타입
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Override PartName="/ppt/slides/slide5.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slides/slide6.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout7.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout8.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Default Extension="png" ContentType="image/png" />
    <Override PartName="/ppt/notesSlides/notesSlide1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml" />
    <Override PartName="/ppt/notesSlides/notesSlide2.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml" />
    <Override PartName="/ppt/notesSlides/notesSlide3.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml" />
    <Override PartName="/ppt/slideMasters/slideMaster1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml" />
    <Override PartName="/ppt/slides/slide3.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slides/slide4.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/presProps.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout4.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout5.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout6.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/theme/theme2.xml"
        ContentType="application/vnd.openxmlformats-officedocument.theme+xml" />
    <Override PartName="/ppt/drawings/drawing1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml" />
    <Override PartName="/ppt/slides/slide1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slides/slide2.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/theme/theme1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.theme+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout2.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout3.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Default Extension="emf" ContentType="image/x-emf" />
    <Default Extension="jpeg" ContentType="image/jpeg" />
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
    <Default Extension="xml" ContentType="application/xml" />
    <Override PartName="/ppt/presentation.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml" />
    <Override PartName="/ppt/notesMasters/notesMaster1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/docProps/app.xml"
        ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml" />
    <Override PartName="/ppt/tableStyles.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout10.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Default Extension="xlsx"
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
    <Override PartName="/ppt/slides/slide7.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slides/slide8.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/slides/slide9.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" />
    <Override PartName="/ppt/viewProps.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml" />
    <Override PartName="/ppt/slideLayouts/slideLayout9.xml"
        ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" />
    <Override PartName="/ppt/charts/chart1.xml"
        ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml" />
    <Override PartName="/docProps/core.xml"
        ContentType="application/vnd.openxmlformats-package.core-properties+xml" />
</Types>
```

- **`<Default>` (확장자 기준)**: "이 패키지 안에서 특정 확장자를 가진 파일들은 모두 이런 형식이다"라고 선언한다.
    - `Default Extension="png" ContentType="image/png"`: `.png` 파일은 이미지임을 알림.
    - `Default Extension="xml" ContentType="application/xml"`: 일반적인 `.xml` 파일들.
- **`<Override>` (특정 파일 기준)**: "이 특정 경로의 파일은 아주 특별한 역할을 한다"라고 명시한다.
    - `PartName="/ppt/presentation.xml"` → `presentation.main+xml`: 이 파일이 프레젠테이션의 메인 뼈대임을 지칭.
    - `PartName="/ppt/slides/slide1.xml"` → `presentationml.slide+xml`: 이 파일이 1번 슬라이드임을 지칭.

=> <mark style="background:#d4b106">즉, \[Content_Types].xml는 Office Open XML(OOXML) 표준에서 가장 먼저 읽히는 파일 중 하나</mark>로, 
- 파일 인식(<mark style="background:#d4b106">명부에 등록되어 있는 타입대로 파일을 인식</mark>), 
- 보안 및 무결성(명부에 없는 파일이 패키지에 포함되어 있다면, 프로그램은 이를 무시하거나 손상된 파일로 간주)에 이용된다. 

## _rels/ - 관계 정의 (Relationships)

PPTX 내의 파일들은 서로 독립적으로 존재하는 것이 아니라, **Relationship(.rels)** 파일을 통해 유기적으로 연결된다. 최상위의 `_rels/` 폴더는 이 전체 패키지의 **'연결 지도'** 역할을 한다.

- **루트 `.rels` 파일 (`/_rels/.rels`)**:
    - PPTX 파일을 열었을 때 가장 먼저 참조되는 파일이다.
    - "이 파일의 메인 콘텐츠는 `/ppt/presentation.xml`에 있고, 메타데이터는 `/docProps/core.xml`에 있다"와 같이 **전체적인 시작 경로**를 정의한다.
    - 이 파일이 없거나 손상되면 프로그램은 어디서부터 데이터를 읽어야 할지 알 수 없게 된다.
- **계층적 관계 구조**:
    - 루트뿐만 아니라 <mark style="background:#d4b106">각 주요 폴더마다 `_rels` 폴더가 존재</mark>할 수 있다.
    - **개별 요소의 연결**: 예를 들어 `ppt/slides/_rels/slide1.xml.rels`는 `slide1.xml`이 사용하는 이미지, 레이아웃, 차트 등이 어디에 위치하는지 구체적인 경로를 연결해 준다.
    - **ID 기반 참조**: XML 본문에서는 복잡한 파일 경로 대신 `rId1` 같은 짧은 ID만 사용하고, 실제 경로는 대응하는 `.rels` 파일에서 관리함으로써 구조를 유연하게 유지한다.

## docProps/ - 문서 속성 정보 (Metadata)

`docProps` 폴더는 프레젠테이션의 실제 슬라이드 내용과는 별개로, <mark style="background:#d4b106">**문서 자체에 대한 정보**</mark>를 담고 있다. 주로 파일의 생성 이력, 통계, 사용자 지정 속성 등을 관리한다.

- **`core.xml` (기본 메타데이터)**: 작성자, 생성/수정 날짜, 제목 등 문서의 기본적인 신원 정보를 담고 있다. Dublin Core 표준 형식을 사용하여 외부 프로그램과의 호환성이 높다.
- **`app.xml` (통계 정보)**: 슬라이드 개수, 숨겨진 슬라이드 수, 사용된 단어 수, 프로그램 버전 등 구체적인 통계 수치를 포함한다. 특히 슬라이드 제목 목록(`TitlesOfParts`)이 들어 있어 전체 목차를 빠르게 파악할 수 있다.
- **`custom.xml` (사용자 지정 속성)**: 사용자가 직접 추가한 속성(예: 프로젝트 ID, 보안 등급 등)이 있을 경우에만 생성되며, 임의의 메타데이터를 저장한다.
## /ppt - 실제 내용

프레젠테이션의 <mark style="background:#d4b106"><mark style="background:#ff4d4f">실제 내용(Content),</mark> 구조(Structure), 디자인(Design)</mark>이 이 폴더에 집중되어 있다. `/ppt` 폴더의 내용은 크게 네 가지 범주로 나누어 볼 수 있다.
### 1. 핵심 구조 및 설정 파일

프레젠테이션의 전체적인 틀과 동작 방식을 결정하는 파일들이다.

- **`presentation.xml`**: 프레젠테이션의 <mark style="background:#d4b106">**'지도'** 역할</mark>을 하는 가장 중요한 파일.
    - 슬라이드의 목록과 순서(`<p:sldIdLst>`)를 정의한다.
    - 슬라이드 크기(4:3, 16:9 등)와 기본 텍스트 스타일 정보를 포함한다.
- **`presProps.xml`**: 프레젠테이션의 <mark style="background:#d4b106">**전역적인 동작 설정**</mark>을 담당한다.
    - 슬라이드 쇼 설정(반복 여부, 나레이션 포함 등)과 인쇄 관련 옵션을 저장한다.
    - 파일의 보안 상태나 편집 제한 여부 등의 속성을 포함한다.
- **`viewProps.xml`**: 사용자가 파일을 열었을 때의 **화면 구성**을 결정한다. <mark style="background:#d4b106">(편집기 보기 설정)</mark>
    - 마지막으로 편집하던 슬라이드 위치와 화면 확대/축소 비율(Zoom)을 기억한다.
    - 편집 화면의 안내선(Guides) 위치나 보기 모드(기본, 슬라이드 분류기 등)를 정의한다.
- **`tableStyles.xml`**: 문서 내에서 공통으로 사용하는 <mark style="background:#d4b106">**표의 디자인**</mark>을 관리한다.
    - 표의 테마 색상, 테두리 두께, 강조 행/열 등 스타일 정의를 담고 있다.
### 2. 콘텐츠 및 디자인 계층 (상속 구조)

<mark style="background:#d4b106">PPTX는 **Master -> Layout -> Slide** 순으로 디자인과 설정을 상속받는 구조</mark>를 가진다.

- **`slides/`**: <mark style="background:#ff4d4f">실제 슬라이드 콘텐츠가 담긴 폴더.</mark>
    - `slideX.xml`: 각 슬라이드의 텍스트, 도형, 표의 위치와 속성이 정의된다.
	    - => [[slideX.xml 구조]]
    - 텍스트 데이터는 주로 `<a:t>` 태그 내에 계층적으로 저장된다.
- **`slideLayouts/`**: 슬라이드에 적용된 레이아웃(제목형, 2단 구성 등) 정보가 들어있다.
- **`slideMasters/`**: 전체 디자인의 근간이 되는 마스터 슬라이드 정보. 배경, 로고, 기본 폰트 등을 관리한다.
- **`theme/`**: 문서 전체의 색상 팔레트(Color), 글꼴 세트(Font), 그래픽 효과(Format)를 정의한다.

### 3. 리소스 및 외부 데이터

<mark style="background:#ff4d4f">슬라이드 내에 삽입된 각종 미디어와 데이터 파일들이 저장된다.</mark>

- **`media/`**: <mark style="background:#d4b106">삽입된 모든 이미지, 동영상, 오디오 파일이 원본 형태로 저장</mark>된다. (예: `image1.png`, `video1.mp4`)
- **`embeddings/`**: <mark style="background:#d4b106">PPT 내에 개체로 삽입된 외부 문서</mark>가 저장(엑셀 표처럼 다른 문서가 통째로 삽입된 경우 원본 파일이 보관)된다. (예: `Microsoft_Office_Excel_Worksheet1.xlsx`)
- **`charts/`**: 슬라이드에 포함된 <mark style="background:#d4b106">차트의 데이터와 그래프 유형 정보</mark>가 XML 형태로 저장된다.
- **`drawings/`**: [SmartArt](https://www.customguide.com/images/lessons/powerpoint-2019/powerpoint-2019--smartart--05.png)나 복잡한 도형 그룹 등 [드로잉](https://cdn1.participoll.com/wp-content/uploads/2020/11/28171619/Draw-powerpoint-2.png) 개체에 대한 상세 정보가 포함된다.

### 4. 기타 부가 정보

- **`notesSlides/`**: 각 슬라이드에 작성된 **발표자 노트** 내용이 포함된다.
- **`notesMasters/`**: 발표자 노트의 인쇄 레이아웃 및 디자인 틀을 담고 있다.
- **`_rels/`**: `presentation.xml`이 어떤 슬라이드나 테마를 참조하는지 정의하는<mark style="background:#d4b106"> 관계 파일</mark>(`presentation.xml.rels`)이 들어있다.

<div style="text-align: center;">
<img src="Pasted%20image%2020260214232520.png" style="max-width: 100%; height: auto;">
</div>
