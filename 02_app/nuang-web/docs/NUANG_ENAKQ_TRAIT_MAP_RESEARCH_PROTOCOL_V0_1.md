# ENAKQ · 관계를 여는 지휘자 성향지도 연구 프로토콜

작성일: 2026-07-20 KST  
문서 상태: `G0_OWNER_APPROVED`
연구 버전: `ENAKQ-TRAIT-MAP-RESEARCH.v0.1`  
예정 지도 버전: `ENAKQ.map.v0.1-draft`  
예정 지식 계약: `nuang-trait-map-knowledge.v0.1`

## 0. 이번 단계의 결과와 한계

이번 문서는 ENAKQ 성향 원문을 완성한 결과가 아니다. 약 5만 자를 쓰기 전에 아래를 고정하는 연구 설계다.

- ENAKQ로 말할 수 있는 것과 말하면 안 되는 것
- 역할명 `관계를 여는 지휘자`의 해석 범위
- 가족·친구·연인·마음 가는 사람·업무별 연구 질문
- 약 5만 자 원문의 상세 목차와 목표 분량
- 문장별 `claimId`, `contentKey`, 근거 연결 방식
- 문헌 검색·선별·검토 절차
- 심리학·심리측정·쉬운 문장·중복·안전 승인 기준

유명 연구를 참고했다는 사실은 뉴앙 ENAKQ가 검증되었다는 뜻이 아니다. 현재 코드 체계 파일의 validation gate도 아직 `not_started`이므로, 이 문서의 통합 해석은 검증 전 가설로 관리한다.

## 1. 기준 자료와 충돌 해결

### 현재 기준

1. `src/features/nuang-code/next-code-scheme.ts`
2. `src/features/nuang-code/candidate-profile-names.ts`
3. `docs/NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md`
4. `docs/NUANG_ALL_CODE_DETAIL_PROFILE_ARCHITECTURE.md`
5. `docs/NUANG_TRAIT_MAP_AND_COMPARISON_KNOWLEDGE_ARCHITECTURE.md`

현재 작업 범례는 아래 순서를 사용한다.

```text
E/I · R/N · G/A · K/M · C/Q
```

과거 S/T·C/V·F/O·D/A·P/E 코드 문서는 역사적 감사 자료일 뿐, ENAKQ 해석에 사용하지 않는다.

### 코드와 개인의 차이

ENAKQ는 각 자리의 현재 대표 방향을 압축한 코드다. 다음 정보까지 자동으로 확정하지 않는다.

- 각 세부 성향 점수가 모두 같은 방향이라는 뜻
- 다섯 자리가 서로 특정한 원인·결과 관계라는 뜻
- 상황마다 항상 같은 행동을 한다는 뜻
- 같은 ENAKQ끼리 모두 비슷한 사람이라는 뜻
- 관계·업무 성과나 능력이 높다는 뜻

대표 성향지도는 `ENAKQ에서 나타날 수 있는 경향`을 설명하고, 개인 리포트는 실제 점수·세부 성향·경계·과정 정보를 반영해 범위를 좁힌다.

## 2. ENAKQ 자리별 구성개념 명세

| 자리 | 현재 의미 | 지도에서 허용되는 해석 | 금지되는 확대 해석 |
|---|---|---|---|
| `E` | 사람들과 함께할 때 활력이 오르고 필요한 말을 먼저 꺼내는 방향 | 교류 활력, 참여 시작, 표현 시작의 상대적 경향 | 사교 능력, 인기, 리더십, 말솜씨, 따뜻함 |
| `N` | 보이는 내용 너머의 가능성·새 원리·관점을 더 탐색하는 방향 | 미적 경험, 상상 확장, 지적 탐구의 후보 경향 | 지능, 창의 능력, 비현실성, 직관 능력 |
| `A` | 관계 상황에서 상대가 어떤 마음인지 자연스럽게 살피는 방향 | 관계에서 주의가 상대 마음·안녕으로 향하는 경향 | 공감 능력, 착함, 자기희생, Agreeableness 전체, 경계 존중 |
| `K` | 시작·지속·정리 흐름이 비교적 꾸준한 방향 | 일상 실행과 구조가 상황 영향을 덜 받는 상대적 경향 | 성실함, 책임감, 생산성, 완벽주의, 도덕성 |
| `Q` | 불편한 상황에서 걱정과 감정이 비교적 빨리 커질 수 있는 방향 | 감정 동요와 걱정·주저의 상대적 활성화 경향 | 정신질환, 감정조절 실패, 예민함, 감수성, 공감, 위험 탐지 능력 |

### 세부 성향 해상도

대표 코드 아래에서 다음 세부 성향을 별도로 확인한다.

- E/I: 함께할 때의 에너지, 먼저 표현하기
- R/N: 미적 경험, 상상 확장, 지적 탐구
- G/A: 원인·해결과 상대 마음 중 먼저 주의가 가는 곳
- K/M: 시작하고 이어가기, 정리하고 계획하기, 맡은 일 이행 후보
- C/Q: 감정 동요, 걱정·주저

N·K·Q 글자가 같아도 세부 성향은 갈릴 수 있다. 장문 지도는 각 세부 성향이 모두 선명하다고 가정하지 않는다.

## 3. 역할명 가설: 왜 ‘관계를 여는 지휘자’인가

역할명은 기억을 돕는 제품 언어이며 독립된 심리 척도가 아니다.

### `관계를 여는`

현재 제품 가설:

- E의 교류·표현 시작 경향
- A의 상대 마음으로 향하는 관계 주의

두 방향이 함께 나타날 때 `사람 사이의 대화나 참여를 시작하면서 상대 반응도 살피는 모습`이 관찰될 수 있다는 가설이다.

아직 말하면 안 되는 것:

- 누구와도 쉽게 친해진다.
- 관계를 잘 이끈다.
- 타인의 마음을 정확히 읽는다.
- 갈등을 잘 해결한다.

### `지휘자`

현재 제품 가설:

- E의 흐름 시작
- N의 가능성·관점 확장
- K의 비교적 꾸준한 실행

아이디어와 사람 사이의 흐름을 시작하고 이어갈 수 있다는 역할 이미지다. 조직 리더십·권한·통솔 능력·성과를 뜻하지 않는다. 사용자 인지 인터뷰에서 `리더여야 한다`, `사람을 지시한다`로 오해되면 역할명 또는 설명을 수정한다.

### Q의 위치

Q는 역할명의 화려한 장점으로 포장하지 않는다. 관계와 일이 중요할 때 걱정과 감정이 빠르게 커질 수 있다는 별도 경향으로 설명한다.

금지:

- Q이므로 진심이 깊다.
- Q이므로 공감이 뛰어나다.
- Q이므로 관계 불안을 가진다.
- Q이므로 감정을 숨기거나 조절하지 못한다.

## 4. 통합 해석 가설 원장

아래는 장문에 바로 넣는 확정 문장이 아니다. 각 가설은 문헌 근거와 뉴앙 데이터가 모두 확인되어야 사용자 문장이 된다.

| 가설 ID | 결합 | 검토할 가설 | 주요 대체 설명 | 현재 상태 |
|---|---|---|---|---|
| `H-ENAKQ-01` | E×N | 대화와 교류 중 새로운 관점이나 가능성을 더 펼칠 수 있음 | 역할 요구, 지식, 말하기 자신감 | 보류·검증 필요 |
| `H-ENAKQ-02` | E×A | 관계에서 먼저 참여하면서 상대의 반응도 살필 수 있음 | 사회적 규범, 호감 욕구, 직업 역할 | 보류·검증 필요 |
| `H-ENAKQ-03` | N×A | 상대의 말에서 감정 외의 배경과 여러 가능성까지 떠올릴 수 있음 | 단순 상상, 걱정, 과잉 추론 | 보류·검증 필요 |
| `H-ENAKQ-04` | A×Q | 상대의 상태가 신경 쓰일 때 걱정과 감정도 빠르게 커질 수 있음 | 애착, 최근 갈등, 스트레스, 관계 중요도 | 보류·민감 검토 |
| `H-ENAKQ-05` | K×Q | 걱정이 커져도 일상의 구조를 유지할 수 있거나, 반대로 확인 행동이 늘 수 있음 | 환경 자원, 건강, 업무량, 완벽주의 | 양방향 가능·단정 금지 |
| `H-ENAKQ-06` | E×K | 함께할 일을 시작하고 일정 흐름을 이어갈 수 있음 | 책임 역할, 외부 마감, 능력 | 보류·검증 필요 |
| `H-ENAKQ-07` | N×K | 아이디어를 구조화해 이어갈 수 있음 | 전문성, 실행 능력, 자원 | 보류·능력 추론 금지 |
| `H-ENAKQ-08` | 전체 | 사람·가능성·마음·지속·빠른 불편 반응이 함께 나타나는 대표 패턴 | 다섯 독립 경향의 단순 병존 | 통합 모형 비교 필요 |

검증 전에는 `E이고 N이라서 반드시 대화로 아이디어를 얻는다` 같은 인과 문장을 사용하지 않는다.

## 5. 처음 드는 생각과 실제 나타나는 반응

ENAKQ 대표 코드만으로 모든 영역의 생각과 행동 순서를 만들지 않는다.

### 현재 사용할 수 있는 구조

- G/A는 같은 관계 장면에서 `처음 드는 생각`과 `실제 나타나는 반응`을 별도 측정하는 파일럿 후보가 있다.
- 대표 A라고 해도 실제 과정은 `A → A`, `A → G`, `G → A`, `G → G` 중 하나일 수 있다.
- 개인 과정 데이터가 없으면 대표 지도에는 `상대 마음에 주의가 가는 경향`까지만 쓴다.

### 현재 사용할 수 없는 구조

- E → I: 교류 욕구와 실제 참여를 측정하지 않았으면 발급하지 않음
- N → R: 가능성 탐색과 실제 결론을 측정하지 않았으면 발급하지 않음
- K → M: 의도와 실행을 같은 상황에서 별도 측정하지 않았으면 발급하지 않음
- Q → C: 마음속 반응과 실제 표현을 별도 측정하지 않았으면 발급하지 않음

장문 지도에는 `ENAKQ는 속으로는 이렇지만 겉으로는 저렇다`는 공통 서사를 만들지 않는다.

## 6. 관계·상황별 연구 질문

### 6.1 일상 전반

- 사람과 함께할 때 활력이 오르는 장면과 소진되는 장면은 무엇인가?
- 새로운 가능성을 펼치는 관심과 실제 결정을 내리는 방식은 어떻게 다른가?
- 상대 마음이 먼저 보이는 순간에도 원인·해결 행동을 선택하는가?
- K의 꾸준함은 어떤 환경에서 유지되고 언제 상황 영향을 더 받는가?
- Q의 걱정·감정 활성화 뒤 어떤 지원과 회복 방식이 편한가?

### 6.2 가족

- 가족 연락·돌봄·역할을 먼저 시작하는 경향은 실제로 있는가?
- 가족의 마음을 살피는 행동이 돌봄, 확인, 간섭 중 무엇으로 받아들여지는가?
- 가족 일정과 역할을 이어가는 K가 부담 축적으로 이어지는 조건은 무엇인가?
- Q가 빠르게 활성화될 때 반복 확인, 혼자 정리, 직접 대화 중 어떤 반응이 나타나는가?
- 가족 문화와 성 역할이 E·A·K처럼 보이게 하는 대체 설명은 무엇인가?

### 6.3 친구

- 모임·대화·약속을 먼저 여는지, 친숙도에 따라 달라지는가?
- 친구의 감정을 살피면서 해결 제안을 언제 함께 하는가?
- 새 경험을 제안하는 관심과 실제 약속을 준비하는 행동은 연결되는가?
- 친구의 답장이 늦을 때 Q의 걱정을 어떻게 해석하고 행동으로 옮기는가?
- 관계 유지 노력의 양이 서로 다를 때 어떤 오해가 생기는가?

### 6.4 연인

- 연락과 표현을 시작하는 빈도는 애정 표현 선호와 구분되는가?
- 상대 마음을 살피는 A가 확인 요구·자기희생·갈등 회피와 어떻게 다른가?
- Q의 빠른 걱정이 실제 표현·조절·회복과 어떤 관계를 가지는가?
- K의 일정·약속 유지가 안정감과 압박 중 무엇으로 경험되는가?
- 코드 유사성보다 두 사람 각각의 경향과 상호작용이 더 중요한지 확인한다.

### 6.5 마음 가는 사람

- 호감 관계에서 E의 먼저 표현하기가 줄거나 커지는가?
- N의 가능성 탐색이 상대 행동을 과도하게 해석하는 것으로 바뀌는 조건은 무엇인가?
- A의 상대 마음 주의와 Q의 걱정을 구분할 수 있는가?
- 관계가 아직 불확실할 때 편한 연락·확인·거리 조절 방식은 무엇인가?
- 애착 유형이나 사회불안을 ENAKQ 코드로 추정하지 않도록 어떤 설명이 필요한가?

### 6.6 업무·학업

- 회의·협업에서 필요한 말을 먼저 꺼내는 경향과 리더십 능력은 어떻게 구분되는가?
- N의 탐색이 아이디어 확장, 학습 흥미, 의사결정 지연 중 무엇으로 나타나는가?
- A의 관계 주의가 협업 조율과 업무 판단에서 어떤 조건에 활성화되는가?
- K의 지속·구조가 성과가 아니라 행동 경향임을 어떻게 설명할 것인가?
- Q의 걱정·감정 활성화를 직무 스트레스나 불안 장애로 확대하지 않으면서 어떤 지원 선호를 안내할 수 있는가?

## 7. 문헌 검색 프로토콜

### 데이터베이스와 공식 자료

- PsycINFO, PubMed, Crossref
- Web of Science 또는 Scopus 접근 가능 시 보조 검색
- Google Scholar는 발견과 인용 추적에만 사용
- BFI-2 저자 연구실, DeYoung Personality Lab, AERA·APA·NCME, International Test Commission 공식 자료
- 뉴앙 내부 문항·인지 인터뷰·파일럿·측정 분석 산출물

### 검색 묶음

1. `Big Five hierarchical facets BFI-2 validation`
2. `Extraversion sociability assertiveness energy level interpersonal behavior`
3. `Open-Mindedness aesthetic sensitivity creative imagination intellectual curiosity`
4. `Compassion interpersonal attention wellbeing attention relationship behavior`
5. `Conscientiousness organization productiveness responsibility situation trait activation`
6. `Negative emotionality anxiety volatility worry daily behavior`
7. `personality states density distribution person situation variability`
8. `actor partner personality relationship satisfaction similarity`
9. `personality family friendship romantic relationship work context`
10. `Korean personality inventory measurement invariance cognitive interview`

각 검색식은 날짜, 데이터베이스, 전체 결과 수, 중복 제거 수, 제목·초록 검토 수, 전문 검토 수, 포함·제외 이유를 남긴다.

### 포함 기준

- 동료평가를 거친 원 연구, 메타분석, 체계적 문헌고찰
- 저자·검사 개발자·전문 기관의 공식 매뉴얼과 지침
- 표본, 측정 도구, 분석 방법, 한계를 확인할 수 있는 자료
- 뉴앙 구성개념 또는 인접 구성개념의 경계를 설명하는 연구
- 관계 비교는 두 사람 자료를 함께 분석한 dyadic 연구를 우선
- 한국어·동아시아 적용은 번역·측정동일성·문화 차이를 다룬 연구를 별도 검색

### 제외 기준

- 출처가 없는 유형 설명, 블로그, SNS 인기 문구
- MBTI 유형 설명을 ENAKQ에 치환한 자료
- 임상 표본 결과를 일반 사용자에게 바로 일반화한 자료
- 성격 유사성만으로 궁합이나 관계 성공을 단정한 자료
- 도구 이름만 같고 실제 문항·구성개념·사용 목적이 다른 연구
- 효과 크기·표본·방법을 확인할 수 없는 2차 요약

## 8. 초기 근거 원장

아래 자료는 출발점이다. 실제 집필 전 검색 업데이트와 전문 검토가 필요하다.

| Evidence ID | 자료 | ENAKQ에서 사용하는 범위 | 사용하지 않는 범위 |
|---|---|---|---|
| `EVD-BFI2-2017` | Soto & John, BFI-2 | 5영역·15 facet의 위계 구조, 세부 성향 필요성 | 뉴앙 한국어 문항의 타당성 대체 |
| `EVD-BFAS-2007` | DeYoung et al., BFAS | broad 영역 아래 관련되지만 구분되는 aspect | 뉴앙의 모든 세부 성향이 2개여야 한다는 주장 |
| `EVD-IPC-2013` | DeYoung et al., 대인 원환·aspect 연구 | Enthusiasm·Assertiveness·Compassion의 대인 위치 구분 | A를 공감 능력이나 Agreeableness 전체로 확장 |
| `EVD-WTT-2015` | Fleeson & Jayawickreme, Whole Trait Theory | 성향의 개인차와 상황별 행동 변산을 함께 설명 | 특정 ENAKQ 행동의 직접 근거 |
| `EVD-STATE-2001` | Fleeson, 성향 상태 분포 연구 | 한 사람이 상황에 따라 넓은 행동 범위를 보일 수 있음 | 모든 사람·모든 축에 동일한 변산 크기 단정 |
| `EVD-TRAIT-ACT-2003` | Tett & Burnett, Trait Activation | 업무 행동에서 상황 요구·제약·촉진을 함께 고려 | K가 업무 성과를 보장한다는 주장 |
| `EVD-DYAD-2010` | Dyrenforth et al., actor·partner·similarity | 관계 만족에서 단순 유사성보다 개인·상대 효과를 분리할 필요 | 뉴앙 코드 궁합 점수나 연애 성공 예측 |
| `EVD-TEST-STANDARDS-2014` | AERA·APA·NCME 검사 표준 | 점수 해석·사용 목적별 타당화 근거 관리 | 표준을 읽었다는 사실을 검증 완료로 표현 |
| `EVD-ITC-2017` | ITC 번역·적응 지침 | 한국어 문화·언어 적응, 번역 이상 검증 | 영어 원척도 결과의 자동 이전 |
| `EVD-COSMIN-2018` | COSMIN 내용타당도 방법 | 관련성·포괄성·이해 가능성 검토 틀 | 임상 PROM 인증을 뉴앙이 받았다는 표현 |
| `EVD-BERKELEY-BFI` | Berkeley Personality Lab 공식 안내 | 공식 규준 부재, 직역보다 전체 의미, 중간 응답의 가치 | 미국 표본 규준을 뉴앙 백분위로 사용 |
| `EVD-GROSS-1998` | Gross, 감정 조절 과정 연구 | 감정 경험과 행동 표현을 구분할 필요 | Q→C 과정이 이미 검증됐다는 주장 |
| `EVD-HORSTMANN-2021` | Personality state 측정 방법 | 상태·상황·개인차를 구분하는 설계 | 한 번의 상황 응답으로 과정 코드 발급 |

## 9. 53,300자 상세 목차

공백 제외 목표다. 45,000~60,000자 범위 안에서 반복 없이 완성한다.

| 순서 | Section ID | 제목 | 목표 분량 | 핵심 산출물 |
|---:|---|---|---:|---|
| 1 | `overview` | ENAKQ를 한눈에 이해하기 | 2,400자 | 핵심 동기, 대표 모습, 읽는 법, 비우열 안내 |
| 2 | `role_name` | ‘관계를 여는 지휘자’라는 이름 | 2,400자 | 이름의 근거와 오해 방지, 지휘자≠리더 능력 |
| 3 | `five_code_positions` | 다섯 코드 자리 깊이 보기 | 7,000자 | E·N·A·K·Q와 세부 성향, 경계·split 사례 |
| 4 | `code_interactions` | 다섯 경향이 함께 나타날 때 | 4,200자 | 2자·3자 조합 가설, 단순 합산과 통합 가설 구분 |
| 5 | `inner_thought_and_response` | 처음 드는 생각과 실제 반응 | 3,300자 | G/A 과정만 조건부, 나머지 과정 추정 금지 |
| 6 | `daily_life` | 일상의 선택과 회복 | 3,500자 | 대화, 휴식, 결정, 변화, 일정의 상황별 경향 |
| 7 | `family` | 가족과 함께 있을 때 | 3,300자 | 연락, 돌봄, 역할, 독립, 갈등 회복 |
| 8 | `friend` | 친구와 가까워지는 방식 | 3,300자 | 모임, 약속, 고민 대화, 거리 조절 |
| 9 | `partner` | 연인과 마음을 나눌 때 | 4,200자 | 표현, 연락, 기대, 갈등, 회복; 성공 예측 금지 |
| 10 | `person_of_interest` | 마음 가는 사람을 알아갈 때 | 3,500자 | 불확실성, 호감 표현, 과잉 해석 방지, 확인 질문 |
| 11 | `work` | 일하고 공부할 때 | 3,800자 | 협업, 아이디어, 피드백, 실행, 스트레스; 능력 추론 금지 |
| 12 | `stress_and_recovery` | 부담이 커질 때와 회복 | 3,300자 | Q 중심의 활성화·지원 선호, 임상 진단 금지 |
| 13 | `strengths_and_growth` | 강점, 과하게 쓸 때, 작은 실험 | 3,500자 | 조건부 강점, 과사용 위험, 실행 가능한 성장 선택지 |
| 14 | `misunderstandings` | 자주 생기는 오해와 대화법 | 3,100자 | 타인이 오해하는 점, 본인이 단정하기 쉬운 점, 질문 |
| 15 | `limitations_and_evidence` | 근거와 아직 모르는 것 | 2,500자 | 출처, 뉴앙 매핑 범위, 검증 상태, 비공개 정보 |
|  |  | **합계** | **53,300자** |  |

### 섹션 공통 작성 단위

각 장면은 아래 순서로 작성한다.

1. 상황
2. 자연스럽게 먼저 주의가 갈 수 있는 곳
3. 실제 나타날 수 있는 반응 후보
4. 반대 사례와 상황 조건
5. 상대가 오해할 수 있는 지점
6. 확인 질문 또는 작은 행동
7. 근거 claim과 한계

## 10. 초기 claim 근거표

`승인 후보`는 사용자 문장으로 다듬을 수 있다는 뜻이며, 운영 공개 승인을 뜻하지 않는다.

| Claim ID | Kind | 후보 의미 | 필수 입력 | Evidence | 상태 | 금지 추론 |
|---|---|---|---|---|---|---|
| `ENAKQ.general.definition.E` | definition | 사람과 함께할 때 활력이 오르고 표현을 시작하는 쪽에 가까움 | SE domain+facets | BFI-2, BFAS, 뉴앙 SE | 승인 후보 | 인기·소통 능력 |
| `ENAKQ.general.definition.N` | definition | 가능성·새 관점·원리를 더 탐색하는 쪽에 가까움 | OE domain+3 facets | BFI-2, Openness/Intellect | 승인 후보 | 지능·창의 능력 |
| `ENAKQ.general.definition.A` | definition | 관계 상황에서 상대 마음에 먼저 주의가 가는 쪽에 가까움 | RO-EC | IPC, 뉴앙 RO-EC | 승인 후보 | 착함·공감 능력 |
| `ENAKQ.general.definition.K` | definition | 시작·지속·정리 흐름이 비교적 꾸준한 쪽에 가까움 | SM domain+facets | BFI-2, BFAS, 뉴앙 SM | 승인 후보 | 성실·책임·성과 |
| `ENAKQ.general.definition.Q` | definition | 불편할 때 걱정과 감정이 비교적 빨리 커지는 쪽에 가까움 | ER domain+facets | BFI-2, BFAS, 뉴앙 ER | 승인 후보 | 진단·예민함 |
| `ENAKQ.general.role.opens` | observable_response | 대화나 참여를 먼저 열면서 상대 반응도 살필 수 있음 | E×A interaction evidence | IPC+뉴앙 파일럿 | 보류 | 관계 능력 |
| `ENAKQ.general.role.conductor` | strength | 사람·아이디어·일정의 흐름을 이어갈 수 있음 | E×N×K evidence | 내부 조합 분석 | 보류 | 리더십·성과 |
| `ENAKQ.general.inner.A` | inner_thought | 상대가 어떤 마음인지 먼저 신경 쓰일 수 있음 | RO-EC thought | 뉴앙 process pilot | 조건부 | 행동도 반드시 A |
| `ENAKQ.general.response.AG` | observable_response | 마음이 먼저 보여도 실제로는 해결 질문을 할 수 있음 | A→G process | 뉴앙 process pilot | 개인 데이터 필요 | 대표 코드 변경 |
| `ENAKQ.general.response.AA` | observable_response | 마음을 먼저 살피고 실제 반응도 들어주기로 나타날 수 있음 | A→A process | 뉴앙 process pilot | 개인 데이터 필요 | 공감 능력 |
| `ENAKQ.general.q.activation` | inner_thought | 중요한 일이 어긋나면 걱정이 빠르게 커질 수 있음 | ER-WD | BFI-2+뉴앙 ER | 승인 후보 | 불안 장애 |
| `ENAKQ.general.q.expression` | observable_response | 걱정이 커진 뒤 겉으로 어떻게 반응하는지는 별도 정보임 | process evidence | Gross+뉴앙 후속 | 승인 후보 | 숨김·조절 능력 |
| `ENAKQ.family.care` | support_preference | 가족의 상태를 확인하고 챙기는 반응이 나타날 수 있음 | A+family evidence | 관계 연구+파일럿 | 보류 | 헌신적 가족상 |
| `ENAKQ.family.friction` | possible_misread | 확인이 잦으면 상대는 간섭으로 느낄 수 있음 | dyadic family evidence | 후속 검색 필요 | 보류 | A는 간섭함 |
| `ENAKQ.friend.initiation` | observable_response | 모임·대화·약속을 먼저 제안할 수 있음 | E+friend context | 상태·상황 연구 | 보류 | 늘 먼저 연락함 |
| `ENAKQ.friend.support` | conversation_prompt | 고민을 들을지 해결을 찾을지 먼저 물어보는 질문이 유용할 수 있음 | G/A interaction | 뉴앙 비교 연구 | 보류 | 모든 친구에게 효과 |
| `ENAKQ.partner.contact` | support_preference | 연락의 양보다 서로 편한 빈도와 확인 방식을 합의할 필요 | dyadic evidence | APIM·후속 검색 | 보류 | 적정 연락 횟수 |
| `ENAKQ.partner.similarity` | boundary | 코드가 같다고 관계 만족이 높다고 말할 수 없음 | dyadic study | Dyrenforth 2010 | 승인 후보 | 궁합 점수 |
| `ENAKQ.crush.ambiguity` | possible_misread | 불확실한 반응에서 가능성 탐색과 걱정이 함께 커질 수 있음 | N×Q context evidence | 후속 검색 필요 | 보류 | 애착 불안 |
| `ENAKQ.crush.prompt` | conversation_prompt | 추정 대신 연락과 만남의 편한 속도를 묻도록 안내 | product safety evidence | 사용자 파일럿 | 보류 | 관계 성공 보장 |
| `ENAKQ.work.voice` | observable_response | 회의에서 선택지나 의견을 먼저 꺼낼 수 있음 | SE-AI+work context | trait activation | 보류 | 리더십 능력 |
| `ENAKQ.work.ideation` | strength | 새로운 관점과 방법을 더 탐색할 수 있음 | OE facets+work context | BFI-2+후속 연구 | 보류 | 창의 성과 |
| `ENAKQ.work.followthrough` | observable_response | 시작한 일을 비교적 꾸준히 이어갈 수 있음 | SM-EP | BFI-2+뉴앙 SM | 승인 후보 | 고성과·책임감 |
| `ENAKQ.stress.worry` | friction | 불확실성과 관계 어긋남에서 걱정이 빨리 커질 수 있음 | ER-WD+context | ER 연구 | 조건부 | 위험 인물·취약함 |
| `ENAKQ.stress.recovery` | support_preference | 회복에 편한 지원은 개인 데이터로 확인해야 함 | recovery preference | 후속 검사 | 승인 후보 | ENAKQ 공통 회복법 |
| `ENAKQ.growth.check` | growth_practice | 상대 마음을 추정하기 전에 원하는 도움을 묻는 연습 | A/Q interaction | 사용자 연구 필요 | 보류 | 치료 조언 |
| `ENAKQ.boundary.variability` | boundary | 같은 사람도 상황에 따라 반대 방향 행동을 할 수 있음 | state distribution | Fleeson, WTT | 승인 후보 | 코드는 무의미함 |

각 claim은 최종 데이터에서 고유 `contentKey`를 가지며, 한 리포트 안에서 같은 의미를 다시 노출하지 않는다.

## 11. 전문가 검토 역할과 합격 기준

실제 전문가가 참여하지 않은 검토를 전문가 승인으로 기록하지 않는다. 에이전트 내부 검토와 외부 자격 전문가 검토 상태를 분리한다.

### 성격심리

- 구성개념과 연구 해석이 일치하는가?
- 상관을 원인으로 바꾸지 않았는가?
- 한 연구의 결과를 모든 ENAKQ에게 일반화하지 않았는가?

### 심리측정

- 실제 측정한 domain·facet·process 범위만 사용하는가?
- 경계·split·측정오차를 숨기지 않는가?
- 한국어 표본 검증 전 규준·백분위를 만들지 않는가?

### 관계·임상 안전

- 애착, 불안, 우울, 공감 능력, 위험성을 코드로 추정하지 않는가?
- 가족·연인 관계를 특정 규범으로 평가하지 않는가?
- 갈등·위기 상황에서 성향 가이드가 전문 도움을 대신하지 않는가?

### 국어·쉬운 문장

- 고등학생이 한 번 읽고 의미를 설명할 수 있는가?
- `리듬`, `온도`, `결`, `파동`처럼 즉시 이해하기 어려운 비유에 의존하지 않는가?
- 한 문장에 상황·생각·행동을 중복해서 넣지 않는가?

### 제품·UX

- 첫 화면은 30초 안에 이해되고 깊은 내용은 단계적으로 열리는가?
- 긴 원문을 읽지 않아도 핵심을 얻을 수 있는가?
- 같은 claim이 요약·코드 자리·관계 장면에서 반복되지 않는가?

## 12. 인지 인터뷰와 파일럿

### 인지 인터뷰 목표

- `관계를 여는 지휘자`를 리더십·지시 능력으로 오해하는지
- A를 착함·공감 능력으로 오해하는지
- K를 성실함, Q를 예민함·정신건강으로 오해하는지
- `처음 드는 생각`과 `실제 나타나는 반응`을 구분하는지
- 반례 문장을 읽은 뒤에도 결과가 틀렸다고 느끼지 않는지
- 가족·친구·연인·업무 문장이 한 관계에만 편향되지 않는지

### 최소 표본 설계 원칙

고정 숫자만 채우고 끝내지 않는다. 아래 변이를 포함하고 의미 포화가 확인될 때까지 반복한다.

- ENAKQ 선명형, 경계형, 세부 성향 split형
- 연령·성별·직업·관계 경험의 다양성
- 본인이 ENAKQ라고 느끼는 사용자와 낯설게 느끼는 사용자
- 쉬운 문장 이해 수준과 앱 사용 숙련도의 다양성

### 정량 파일럿

- 문장별 자기일치도만으로 진실을 확정하지 않는다.
- 이해도, 유용성, 과도한 단정감, 낙인감, 반복감, 공유 의향을 분리 측정한다.
- claim별 domain/facet 점수와의 관계를 확인한다.
- 같은 코드 안의 세부 성향 차이가 문장 평가를 설명하는지 확인한다.
- 가족·친구·연인·업무 맥락별 측정동일성과 DIF 후보를 점검한다.

## 13. 승인 게이트

| Gate | 산출물 | 통과 조건 |
|---|---|---|
| `G0` | 연구 프로토콜 | 사용자 방향 승인, 현재 코드 정의와 충돌 없음 |
| `G1` | 검색 기록·근거표 | 포함·제외 추적 가능, 주요 claim에 근거 연결 |
| `G2` | 53,300자 초안 | 모든 목차 완료, 반복으로 분량을 채우지 않음 |
| `G3` | 성격심리·측정 검토 | 과잉해석·인접 구성개념 침범·미측정 과정 차단 |
| `G4` | 국어·안전 검토 | 쉬운 문장, 낙인·임상·관계 결정론 차단 |
| `G5` | 인지 인터뷰 수정본 | 역할명·코드 자리·생각/반응 구분 이해 확인 |
| `G6` | 정량 파일럿 보고서 | claim별 지지·반박·보류 상태 결정 |
| `G7` | 제품·중복 감사 | `claimId`·`contentKey` 중복 0, 화면별 역할 분리 |
| `G8` | `ENAKQ.map.v1.0` | 모든 전문 검토 `passed`, 45,000~60,000자, 버전 발행 |

## 14. 다음 실행 단위

프로토콜 승인 뒤 바로 53,300자를 한 번에 생성하지 않는다.

1. 문헌 검색 기록과 evidence ledger 확장
2. `overview`, `role_name`, `five_code_positions` 3개 장의 첫 11,800자 초안
3. claim·evidence 역추적과 중복 감사
4. 사용자 문구 검토
5. 승인된 방식으로 나머지 관계·상황 장 확장

첫 초안 묶음에서 구성개념과 문체가 확정되어야 나머지 약 4만 자의 품질을 일관되게 유지할 수 있다.

## 15. 초기 공식·연구 출처

1. [Soto & John (2017), The Next Big Five Inventory (BFI-2)](https://escholarship.org/uc/item/16x6n05t)
2. [Colby College Personality Lab — BFI-2](https://www.colby.edu/academics/departments-and-programs/psychology/research-opportunities/personality-lab/the-bfi-2/)
3. [Berkeley Personality Lab — Big Five Inventory](https://www.ocf.berkeley.edu/~johnlab/bfi.html)
4. [DeYoung, Quilty, & Peterson (2007), Between Facets and Domains](https://doi.org/10.1037/0022-3514.93.5.880)
5. [DeYoung et al. (2013), Big Five Aspects and the Interpersonal Circumplex](https://doi.org/10.1111/jopy.12020)
6. [Fleeson (2001), Traits as Density Distributions of States](https://doi.org/10.1037/0022-3514.80.6.1011)
7. [Fleeson & Jayawickreme (2015), Whole Trait Theory](https://pubmed.ncbi.nlm.nih.gov/26097268/)
8. [Tett & Burnett (2003), A Personality Trait-Based Interactionist Model of Job Performance](https://doi.org/10.1037/0021-9010.88.3.500)
9. [Dyrenforth et al. (2010), Actor, Partner, and Similarity Effects](https://pubmed.ncbi.nlm.nih.gov/20718544/)
10. [AERA·APA·NCME — Standards for Educational and Psychological Testing](https://www.aera.net/Newsroom/AERA-APA-and-NCME-Announce-the-Open-Access-Release-of-Standards-for-Educational-and-Psychological-Testing/mid/50388/dnnprintmode/true?SkinSrc=%5BG%5DSkins%2F_default%2FNo+Skin)
11. [International Test Commission — Translating and Adapting Tests](https://www.intestcom.org/page/14)
12. [COSMIN content validity Delphi study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/)
13. [Gross (1998), Antecedent- and Response-Focused Emotion Regulation](https://pubmed.ncbi.nlm.nih.gov/9457784/)
14. [Horstmann et al. (2021), Assessing Personality States](https://doi.org/10.1002/per.2266)

출처는 뉴앙 문장을 자동으로 승인하지 않는다. 최종 사용자 문장에는 해당 연구가 직접 지지하는 범위와 뉴앙 자체 검증 상태를 함께 기록한다.

## 16. 사용자 승인 기록

2026-07-20 KST 사용자 승인으로 아래 네 가지를 확정했다.

1. 역할명 `관계를 여는 지휘자`를 유지하되 리더십·통솔 능력으로 해석하지 않는다.
2. 첫 전체 원문은 공백 제외 53,300자를 목표로 한다.
3. G/A 과정은 개인 과정 데이터가 있을 때만 제공하며 다른 자리의 생각·행동 순서를 추정하지 않는다.
4. 궁합 점수 없이 관계별 강점·힘들 수 있는 장면·오해·대화 방법을 제공한다.

## 17. G1 첫 집필 산출물

- 사용자 원문 초안: [`ENAKQ_MAP_DRAFT_PART1_V0_1.md`](./trait-maps/ENAKQ/ENAKQ_MAP_DRAFT_PART1_V0_1.md)
- 문단별 근거 원장: [`ENAKQ_EVIDENCE_LEDGER_PART1_V0_1.md`](./trait-maps/ENAKQ/ENAKQ_EVIDENCE_LEDGER_PART1_V0_1.md)

첫 묶음은 공백 제외 11,788자로 작성했다. 현재 상태는 연구 초안이며, 사용자 문구 검토와 인지 인터뷰·정량 파일럿을 통과하기 전에는 운영 성향 지도의 확정 문구로 사용하지 않는다.

이에 따라 G0를 통과하고 첫 세 장 11,800자 초안과 실제 근거표 작업을 시작한다.
