# NUANG 성향 검사 연구 레퍼런스·반영 원장

작성일: 2026-07-17 KST  
문서 상태: `EVIDENCE_LEDGER_V2_RO_REBASELINED`  
적용 범위: 뉴앙 코어 성향 구조, 5글자 코드, 문항 개발, 채점·리포트·공정성 검증  
목적: 어떤 연구와 공식 자료를 왜 참고했고, 무엇을 반영·수정·제외했는지 추적 가능하게 기록한다.

## 0. 가장 중요한 전제

유명한 이론을 참고했다는 사실만으로 뉴앙 검사의 신뢰도와 타당성이 자동 확보되지는 않는다.

```text
전문 연구 참고
≠ 뉴앙 한국어 문항 검증 완료
≠ 뉴앙 점수 경계 검증 완료
≠ 모든 사용자 집단에서 공정함 입증
```

연구는 `무엇을 측정할지` 정하는 출발점이다. 뉴앙이 신뢰 가능한 검사가 되려면 별도로 아래를 통과해야 한다.

- 구성개념 정의와 인접 성향 경계
- 독립 전문가 내용타당도와 blind mapping
- 2030 한국어 사용자의 인지 인터뷰
- 탐색적·확인적 요인분석
- 신뢰도·측정오차·재검사 안정성
- 수렴·변별·증분 타당도
- 연령·성별·직업·문화 집단별 측정동일성과 DIF
- 빠른·정밀 검사 결과의 정보량과 갱신 안정성
- 결과 문구의 이해 가능성·낙인·오해 검증

앱에서는 현재 검증 단계와 검사 버전을 함께 공개한다.

## 1. 전체 참고 체계 한눈에 보기

| 참고 체계             | 잘하는 점                                                         | 뉴앙 목적에서 그대로 쓰기 어려운 점                                                                            | 뉴앙이 반영한 방식                                                                                                     |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| MBTI                  | 4글자로 기억·공유하기 쉽고 선호 차이를 비우열적으로 설명          | 네 선호쌍만으로 뉴앙이 필요한 불편 정서 반응을 다루지 않으며, 유형 글자가 연속 차이와 세부 조합을 숨길 수 있음 | 사람→생각→관계→일상의 익숙한 읽기 흐름과 E/I·N 방향 친숙성만 활용; 연속 점수·세부 성향·경계·다섯 번째 C/Q 추가         |
| Big Five/FFM          | 다섯 broad domain을 연속 차원으로 설명하는 강한 경험적 틀         | 전문 용어가 어렵고 넓은 영역 하나만으로는 생활 차이가 뭉개지며 뉴앙의 모든 코드 자리가 일대일 대응하지 않음    | 다섯 자리·연속 점수·측정오차의 비교 틀로 사용하되 G/A를 포함한 각 자리는 독자 범위를 별도 검증                         |
| BFAS                  | Big Five 각 영역을 두 관련 aspect로 나눠 broad와 세부 사이를 설명 | 모든 영역을 반드시 두 개로 나누는 유일한 정답은 아니며 관련 aspect를 고객 코드에 합쳐도 된다는 근거는 아님     | SE·ER·SM의 구조 가설과 RO-EC·RO-RN 분리 연구에 사용; G/A에는 RO-EC만 포함하고 RO-RN은 본인 전용 신호로 분리            |
| BFI-2                 | 5 domain × 3 facet의 위계 구조로 세부 설명력을 높임               | 60문항 원척도도 뉴앙 한국어·제품 목적에 자동 타당하지 않으며, 초단축판은 facet 해석에 부적합                   | OE 3-facet 채택, SM Responsibility 후보, 다른 영역의 누락 범위 감사; 빠른 검사에서 적은 문항으로 facet을 확정하지 않음 |
| HEXACO                | Honesty-Humility를 포함한 6요인 대안을 제시                       | 코어가 6글자·64조합이 되고 정직·겸손이 도덕 등급처럼 읽힐 위험                                                 | 5글자 공개 코어에는 미포함; 동의 기반 상세검사 후보로 보존                                                             |
| IPIP                  | 공개 도메인 문항·척도 저장소로 문항 연구와 권리 추적에 유용       | 공개 도메인이라는 사실은 한국어 번역·뉴앙 매핑의 타당성을 보장하지 않음                                        | 후보 문항의 아이디어·권리 근거로만 사용하고 모든 문항을 새 사양·전문가 검토·파일럿에 통과시킴                          |
| 검사 개발 표준·방법론 | 무엇을 검증하고 어떻게 근거를 쌓아야 하는지 제시                  | 특정 성향 구조나 문항을 대신 결정해주지 않음                                                                   | 구성개념→문항 풀→내용타당도→인지 인터뷰→파일럿→요인·신뢰도·공정성 검증 순서에 반영                                     |

## 2. MBTI에서 가져온 것과 보완한 것

### 2.1 공식 자료가 설명하는 MBTI

Myers & Briggs Foundation은 MBTI를 아래 네 선호쌍으로 설명한다.

- E/I: 에너지와 주의가 바깥 또는 안쪽으로 향하는 선호
- S/N: 구체적 사실·세부와 패턴·가능성 중 정보를 받아들이는 선호
- T/F: 논리·비인격적 사실과 사람·가치 중 결론에 무게를 두는 선호
- J/P: 구조·결정·종결과 선택지 개방·새 정보 중 외부 생활 선호

공식 설명은 어느 선호도 더 옳거나 우월하지 않으며 누구나 양쪽을 사용할 수 있다고 명시한다. 뉴앙은 이 비우열 원칙을 그대로 채택한다.

### 2.2 뉴앙 목적에서 확인한 한계

아래는 MBTI 전체가 잘못됐다는 주장이 아니라 `뉴앙의 자기이해·관계·커뮤니티 제품 목적`에 그대로 사용하기 어려운 지점이다.

#### 네 글자만으로는 불편 정서 반응 영역이 없다

Myers-Briggs Company의 Big Five 비교 자료도 Big Five의 Neuroticism에 해당하는 영역이 MBTI 모델에는 포함되지 않는다고 설명한다.

뉴앙의 보완:

- 좌절·갈등에서의 감정 동요와 불확실성 앞의 걱정·주저를 별도 ER로 둔다.
- 다섯 번째 C/Q를 `정신건강 등급`이 아니라 불편 정서 활성화 경향으로 제한한다.

#### 유형 글자는 경계와 세부 차이를 숨길 수 있다

MBTI는 질적으로 다른 선호 유형을 설명하는 모델이고, Big Five는 연속 차원 모델이다. McCrae와 Costa의 비교 연구는 MBTI 네 지표가 Big Five 네 영역과 관련되지만 두 모델이 동일하지 않음을 보여준다.

뉴앙의 보완:

- 모든 축의 원본을 연속 점수와 측정오차로 저장한다.
- `CLEAR`, `SPLIT_PROFILE`, `NEAR_BOUNDARY`, `INSUFFICIENT_EVIDENCE`를 구분한다.
- 글자가 같아도 세부 성향 조합과 선명도를 함께 보여준다.

#### 같은 글자를 쓰면 자동 변환 오해가 생긴다

뉴앙의 보완:

- E/I는 방향이 가장 가깝기 때문에 첫 자리에 재사용한다.
- N은 가능성 방향을 유지하지만 반대 글자는 S가 아니라 R로 구분한다.
- 관계 자리는 T/F 대신 G/A, 일상 자리는 J/P 대신 K/M을 사용한다.
- C/Q는 MBTI에 직접 대응하지 않는 뉴앙 고유 다섯 번째 자리로 둔다.
- `MBTI 결과 → 뉴앙 코드` 자동 변환표를 제공하지 않는다.

#### 넓은 선호만으로 생활 속 혼합 반응을 설명하기 어렵다

뉴앙의 보완:

- E/I 아래 교류 활력과 주도적 표현을 분리한다.
- R/N 아래 미적 경험·상상 확장·지적 탐구를 분리한다.
- G/A는 원인·해결과 상대 마음의 관계 주의 방향으로 좁힌다.
- 선택·존엄 존중은 G/A에 합산하지 않고 본인 전용 상세 신호로 분리한다.
- K/M 아래 실행·지속과 질서·구조를 분리한다.
- C/Q 아래 감정 동요와 걱정·주저를 분리한다.

### 2.3 가져오지 않은 것

- MBTI 인지기능과 유형역동을 뉴앙 채점 모델로 복제하지 않는다.
- 16유형 설명을 32개 뉴앙 조합에 재사용하지 않는다.
- MBTI 글자의 의미를 바꿔 쓰지 않는다.
- 직업 적합성·능력·관계 성공을 유형만으로 예측하지 않는다.

## 3. Big Five/FFM에서 가져온 것과 보완한 것

### 3.1 가져온 핵심

뉴앙은 공개 코어의 코드 자리 수를 다섯 개로 유지한다. 다만 Big Five 다섯 영역을 일대일로 복제하지 않는다.

| Big Five 계열                     | 뉴앙 내부 상위 영역                               | 고객 영역             |
| --------------------------------- | ------------------------------------------------- | --------------------- |
| Extraversion                      | SE 사람 사이 에너지                               | 사람 사이 에너지      |
| Openness/Open-Mindedness          | OE 경험·아이디어 개방성                           | 생각과 탐색           |
| Agreeableness                     | RO 연구 배경; G/A는 RO-EC 관계 주의 방향으로 좁힘 | 관계에서 먼저 보는 것 |
| Conscientiousness                 | SM 목표 실행과 생활 구조                          | 일상을 꾸리는 방식    |
| Neuroticism/Negative Emotionality | ER 불편 정서 반응성                               | 걱정과 감정 반응      |

다섯 자리는 사람 전체를 다섯 종류로 분류한다는 뜻이 아니다. 각 자리를 연속 점수로 다루되, Big Five와의 대응 범위와 뉴앙 고유 범위를 자리별로 공개하고 검증한다.

### 3.2 그대로 쓰지 않은 이유

#### 전문 용어와 낙인이 어렵다

`Agreeableness`, `Conscientiousness`, `Neuroticism`을 그대로 번역하면 착함·성실함·신경증 같은 우열·임상 의미가 붙기 쉽다.

뉴앙의 보완:

- 고객 화면에는 `관계에서 먼저 보는 것`, `일상을 꾸리는 방식`, `걱정과 감정 반응`을 사용한다.
- 전문 용어는 내부 분석·연구 근거 페이지에만 제한적으로 사용한다.
- 점수에서 도덕성·능력·진단을 추론하지 않는다.

#### broad domain 하나는 생활 차이를 숨긴다

뉴앙의 보완:

- 세부 성향 점수를 원본으로 보존한다.
- 서로 다른 세부 성향을 평균으로 숨기지 않는다.
- 코드지도에서 한 글자를 누르면 세부 성향·선명도·경계를 펼친다.

#### 영어 원척도는 한국어 뉴앙에 자동 적용되지 않는다

Berkeley Personality Lab도 번역에서 직역보다 전체 의미, 역번역, 오해 가능성 검토를 강조한다.

뉴앙의 보완:

- 영어 문항을 단순 번역하지 않고 한국어 생활 상황과 단일 반응으로 다시 작성한다.
- 2030 한국어 사용자 인지 인터뷰와 독립 한국어 문항 검토를 수행한다.
- 한국어 파일럿에서 요인구조·편향·측정동일성을 다시 확인한다.

## 4. BFAS에서 가져온 것과 보완한 것

DeYoung, Quilty, Peterson의 BFAS 연구는 Big Five 각 영역 아래에 서로 관련되지만 구분되는 두 aspect, 총 10개가 존재할 수 있다는 중간 구조를 제시했다.

### 4.1 뉴앙 반영표

| BFAS aspect     | 뉴앙 세부 성향 가설  | 반영 방식                                                               |
| --------------- | -------------------- | ----------------------------------------------------------------------- |
| Enthusiasm      | SE-RE 교류 활력      | 사람과 함께할 때의 활력·관여로 좁힘                                     |
| Assertiveness   | SE-AI 주도적 표현    | 리더십 능력이 아니라 필요한 말을 먼저 꺼내는 경향으로 좁힘              |
| Compassion      | RO-EC 공감적 관심    | 공감 능력이 아니라 상대 감정·안녕에 주의를 두는 경향으로 좁힘           |
| Politeness      | RO-RN 선택·존엄 존중 | 예절 점수가 아니라 압박·비하를 억제하고 선택권을 존중하는 경향으로 좁힘 |
| Industriousness | SM-EP 실행·지속      | 성과가 아니라 시작·복귀·지속·마무리 경향으로 좁힘                       |
| Orderliness     | SM-OS 질서·구조      | 청결·완벽주의가 아니라 물건·시간·절차 구조화로 좁힘                     |
| Volatility      | ER-IR 감정 동요      | 모든 감정이 아니라 좌절·갈등의 불편 정서 활성화로 좁힘                  |
| Withdrawal      | ER-WD 걱정·주저      | 임상 불안·우울이 아니라 일상적 불확실성·평가 앞의 걱정과 주저로 좁힘    |
| Openness        | 기존 OE-AS           | 미적 경험과 상상이 분리될 수 있어 OE-AE·OE-CI로 재분해                  |
| Intellect       | OE-IE 지적 탐구      | 지능 자기평가가 아니라 개념·원리·관점 탐색의 관심으로 좁힘              |

### 4.2 보완한 이유

- 두 aspect 구조는 강한 선례이지만 모든 영역에 유일한 구조는 아니다.
- BFAS의 넓은 Openness에는 미적 경험과 상상이 함께 들어갈 수 있어 뉴앙이 원하는 상세 설명을 숨긴다.
- Intellect는 지적 능력으로 오해될 수 있으므로 뉴앙은 `지적 탐구 관심`만 측정한다.
- BFAS 구조를 그대로 복제하지 않고 BFI-2의 3-facet 대안과 제품 목적을 함께 검토한다.

## 5. BFI-2에서 가져온 것과 보완한 것

BFI-2는 다섯 domain 각각을 세 facet으로 구성하는 60문항 위계 모델이다. Colby College의 저자 공식 페이지와 Berkeley Personality Lab은 BFI-2 양식·채점·번역·짧은 형식 정보를 제공한다.

### 5.1 뉴앙에 반영한 정확한 내용

| BFI-2 영역·facet                                                                   | 뉴앙 판단                                                                                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Extraversion: Sociability·Assertiveness·Energy Level                               | SE-RE가 사회적 참여와 활력을 함께 묶어도 되는지 파일럿에서 검증하는 비교 기준                              |
| Agreeableness: Compassion·Respectfulness·Trust                                     | Compassion·Respectfulness는 RO 코어에 반영; 일반적 Trust는 관계 상세검사로 분리                            |
| Conscientiousness: Organization·Productiveness·Responsibility                      | Organization·Productiveness는 SM-OS·SM-EP에 반영; Responsibility는 SM-RL 제3 facet 후보                    |
| Negative Emotionality: Anxiety·Depression·Emotional Volatility                     | Anxiety·Volatility는 ER-WD·ER-IR에 반영; Depression은 공개 성향 코드가 아니라 별도 웰빙·전문 영역으로 분리 |
| Open-Mindedness: Aesthetic Sensitivity·Creative Imagination·Intellectual Curiosity | OE-AE 미적 경험·OE-CI 상상 확장·OE-IE 지적 탐구의 3-facet으로 사용자 승인                                  |

### 5.2 그대로 쓰지 않은 이유

- 미국 영어 원척도의 구조와 문항이 한국어 2030 사용자에게 그대로 재현된다는 보장이 없다.
- Berkeley Personality Lab은 BFI-2에 공식 규준 매뉴얼이 없다고 안내한다. 뉴앙은 자체 한국어 표본 검증 전 백분위·규준을 임의로 만들지 않는다.
- 60문항은 제품 흐름과 다를 수 있지만, 짧게 줄인다고 세부 성향을 확정할 근거가 생기는 것은 아니다.
- BFI-2-S 연구는 대규모 표본에서 facet 활용 가능성을 제시하지만, BFI-2-XS는 facet 평가에 사용하지 말아야 한다고 보고한다.

뉴앙의 보완:

- 빠른 검사에서는 축 방향을 예비로 제공하고 facet을 확정하지 않는다.
- 정밀 검사는 승인된 각 facet을 여러 상황과 여러 문항으로 측정한다.
- OE 3-facet을 유지하기 위해 20문항 고정을 우선하지 않는다.
- BFI-2 문항을 복사하지 않고 독자 문항 은행과 권리·출처 필드를 관리한다.

## 6. HEXACO를 검토하고 코어에서 제외한 이유

HEXACO는 여러 언어의 성격 어휘 연구에서 여섯 차원 구조를 제안하며, Big Five에 없는 Honesty-Humility를 포함한다.

검토 가치:

- 정직·겸손, 공정성, 탐욕 회피 같은 특성이 관계·커뮤니티 행동에 추가 설명을 제공할 수 있다.
- Big Five만이 성격 구조의 유일한 가능한 모델이 아님을 확인하게 한다.

공개 코어에서 제외한 이유:

- 여섯 글자는 64개 조합으로 늘어나 기억·공유·캐릭터·커뮤니티 분류 부담이 커진다.
- 정직·겸손은 고객에게 착함·도덕성 등급으로 읽히기 쉽고 사회적 바람직성의 영향이 크다.
- 공개 프로필에서 도덕적 인상을 강하게 만드는 것은 뉴앙의 비우열 원칙과 충돌한다.

반영 방식:

- 5글자 공개 코어는 유지한다.
- 정직·공정·신뢰 관련 내용은 필요 시 동의 기반 상세검사로 별도 연구한다.
- HEXACO를 검토했다는 이유로 현재 뉴앙이 Honesty-Humility를 측정한다고 주장하지 않는다.

## 7. IPIP를 사용한 범위와 한계

International Personality Item Pool은 공식 사이트에서 문항과 척도를 공개 도메인으로 제공한다.

뉴앙이 활용한 범위:

- Big Five 계열에서 어떤 행동 문장이 사용되는지 후보 풀을 감사
- 문항 방향과 구성개념 매핑의 비교 자료
- 공개 도메인 여부와 출처 권리 추적

뉴앙이 하지 않는 것:

- 영어 IPIP 문항을 그대로 번역해 운영 문항으로 사용
- IPIP 척도의 검증 결과를 뉴앙 한국어 문항의 검증 결과로 대신 사용
- 공개 도메인이라는 이유로 사회적 바람직성·문화 편향·교차 적재 검토를 생략

모든 새 문항에는 출처·권리·목표 facet·상황·인접 성향 위험·검증 상태를 별도 저장한다.

## 8. 영역 경계를 정교화한 추가 연구

### 8.1 McCrae & Costa (1989)

핵심:

- MBTI 네 지표와 Five-Factor Model의 일부 영역이 경험적으로 관련된다.
- 관련성이 있어도 두 모델은 동일하지 않다.

뉴앙 반영:

- 코드 순서는 익숙한 주제 위치를 활용한다.
- MBTI와 뉴앙 사이 자동 변환을 금지한다.
- E/I와 N만 방향 친숙성을 제한적으로 활용한다.

### 8.2 DeYoung et al. (2009) — Openness와 Intellect

핵심:

- 미적·지각적 경험에 대한 Openness와 추상적 정보에 대한 Intellect가 구분될 수 있다.

뉴앙 반영:

- OE에서 미적 경험·상상과 지적 탐구를 구분했다.
- Intellect를 지능이 아니라 지적 활동에 대한 관심으로 제한했다.
- 이후 BFI-2를 반영해 미적 경험과 상상 확장도 분리했다.

### 8.3 DeYoung et al. (2013) — 대인 행동 구조

핵심:

- Extraversion의 Enthusiasm·Assertiveness와 Agreeableness의 Compassion·Politeness가 대인 행동 구조에서 서로 다른 위치를 가진다.

뉴앙 반영:

- 먼저 표현하는 SE-AI와 상대를 고려하는 RO를 같은 축으로 섞지 않는다.
- 사회적 활력, 주도성, 공감, 비강압을 별도 facet으로 관리한다.

### 8.4 Jensen-Campbell & Graziano (2001) — 관계 갈등

핵심:

- Agreeableness는 긍정적인 대인관계를 유지하려는 동기와 갈등 상황의 반응·전략에 관련된다.

뉴앙 반영:

- G/A를 추상적인 착함이 아니라 마음과 해결이 함께 있는 관계 장면의 주의 방향으로 관찰한다.
- 원인·해결과 상대 마음을 구분하되 논리력·공감 능력·갈등 회피·자기희생으로 과장하지 않는다.
- 선택·존엄 존중은 중요한 별도 관계 행동 신호로 연구하되 G/A 정체성 코드에 합산하지 않는다.

### 8.5 Larsen & Ketelaar (1989) — 긍정·부정 정서 분리

핵심:

- 긍정 정서 강도는 Extraversion, 부정 정서 강도는 Neuroticism과 더 밀접하게 관련될 수 있다.

뉴앙 반영:

- SE의 교류 활력과 ER의 불편 정서 반응을 분리한다.
- ER을 모든 감정의 풍부함이나 감수성으로 해석하지 않는다.

### 8.6 Gross (1998) — 감정 경험과 표현 과정 분리

핵심:

- 감정 반응은 경험·행동 표현·생리 반응으로 구분해 관찰할 수 있다.
- 감정이 형성되기 전의 조절과 반응이 형성된 뒤의 표현 조절은 같은 과정이 아니다.

뉴앙 반영:

- C/Q의 마음속 반응과 실제 나타나는 반응이 다를 가능성을 후속 연구 후보로 둔다.
- `Q → C`를 회복력, 감정조절 능력, 감정 숨김으로 자동 해석하지 않는다.
- C/Q 과정 프로필은 안전성과 민감정보 공개 범위를 별도로 검증한다.

### 8.7 Horstmann et al. (2021) — 상황별 성향 상태 측정

핵심:

- 성향 상태 측정은 사람 간 차이와 한 사람 안에서 상황에 따라 달라지는 차이를 분리할 수 있어야 한다.
- 기대·상황·상태의 관계를 검증하려면 각 측정이 기본적으로 같은 내용을 반복하지 않도록 변별타당도를 확인해야 한다.

뉴앙 반영:

- 화살표 과정 프로필은 하나의 포괄 점수를 둘로 나눠 붙이지 않는다.
- 같은 과정 차이가 여러 중간 강도 상황에서 반복될 때만 발급 후보를 만든다.
- E/I와 R/N은 현재 process pair가 없으므로 화살표 대신 세부 성향 지도를 우선한다.

## 9. 검사 개발 표준과 방법론을 반영한 방식

### 9.1 AERA·APA·NCME 검사 표준

핵심:

- 검사의 타당성은 검사 이름에 붙는 절대 인증이 아니라, 특정 점수를 특정 목적으로 해석·사용하는 데 필요한 근거의 문제다.

뉴앙 반영:

- 빠른 결과·정밀 결과·공개 프로필·관계 비교마다 허용되는 주장 범위를 따로 관리한다.
- 검사 버전과 사용 목적을 공개한다.
- 검증 전 운영 배포를 막는 상태를 둔다.

### 9.2 Boateng et al. (2018)

핵심:

- 문항 개발, 척도 개발, 척도 평가를 순차적으로 수행하고 내용타당도·사전검사·요인분석·신뢰도·타당도를 함께 검토한다.

뉴앙 반영:

- 기존 60문항을 바로 수정하지 않고 충분한 후보 문항 은행을 먼저 만든다.
- 전문가 검토·인지 인터뷰 후 파일럿 문항을 줄인다.
- 탐색 표본과 확인 표본을 구분한다.

### 9.3 Clark & Watson (2019)

핵심:

- 명확한 구성개념, 충분히 넓은 초기 문항 풀, 문구 품질, 인접 구성개념 대조, 적절한 표본, 위계 구조, 수렴·변별타당도가 중요하다.

뉴앙 반영:

- 글자보다 구성개념 정의를 먼저 확정했다.
- 한 문항은 하나의 facet과 하나의 반응만 측정한다.
- SE-AI/RO, OE/SM, RO/ER 같은 인접 성향 경계를 문항 필드로 관리한다.
- alpha 하나로 구조를 승인하지 않는다.

### 9.4 COSMIN 내용타당도

핵심:

- 내용타당도는 관련성, 포괄성, 이해 가능성을 포함한다.
- 각 하위 점수는 서로 다른 구성개념을 나타내므로 별도로 평가해야 한다.

뉴앙 반영:

- 각 facet마다 상황 범위가 충분한지 확인한다.
- 빠진 핵심 행동과 과도한 문항 반복을 점검한다.
- 한국어 사용자가 의도대로 이해하는지 별도로 검증한다.

COSMIN은 주로 건강 결과 측정 도구를 위한 방법론이다. 뉴앙은 이를 그대로 인증 기준으로 주장하지 않고 내용타당도 사고방식의 참고 자료로 사용한다.

### 9.5 인지 인터뷰 방법론

핵심:

- 사용자가 질문을 어떻게 이해하고, 어떤 장면을 떠올리고, 어떻게 응답을 고르는지 직접 확인한다.

뉴앙 반영:

- 상황 라벨과 질문이 중복되는지 확인한다.
- `판단하기 어려워요`가 문항 모호성·경험 없음·상황 부적합 중 무엇인지 탐색한다.
- 사회적으로 좋아 보이는 답을 고르는지 확인한다.
- 크게 수정한 문항은 다시 인터뷰한다.

## 10. 연구가 제품 결정으로 이어진 추적표

| 제품 결정            | 직접 근거                                                    | 보완·제한                                                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 5개 상위 영역 유지   | Big Five/FFM, BFI-2                                          | 사람 성격이 정확히 다섯 종류라는 주장은 금지                                         |
| 첫 자리 E/I          | MBTI 공식 E/I, BFAS Extraversion                             | 관계 능력·사교성 전체가 아니라 교류 활력+주도적 표현                                 |
| 두 번째 R/N          | MBTI S/N 방향 친숙성, Openness 연구                          | S/N 복제 금지; R 현실 능력·N 지능 해석 금지                                          |
| 세 번째 G/A          | RO-EC 관계 주의 문항, BFAS Compassion 참고, 상황별 주의 연구 | Agreeableness 전체 복제·MBTI T/F 변환 금지; 원인·해결과 상대 마음의 주의 방향만 측정 |
| RO-RN 본인 전용 신호 | BFAS Politeness, BFI-2 Respectfulness, 대인 갈등 연구        | G/A 합산 금지; 본인 리포트 제공, 공개·공유·비교 기본 제외                            |
| 네 번째 K/M          | BFAS Conscientiousness, BFI-2, MBTI J/P 비교                 | J/P 폐기; M을 유연성·게으름으로 해석 금지                                            |
| 다섯 번째 C/Q        | BFAS Neuroticism, BFI-2 Negative Emotionality, 정서 연구     | 임상 진단·감수성·위험 탐지 능력 해석 금지                                            |
| OE 3-facet           | BFI-2 Open-Mindedness                                        | 3-facet 채택은 사용자 결정, 실제 구조는 한국어 파일럿 검증 필요                      |
| 분리 프로필          | 위계형 domain/facet 연구, 검사 표준                          | 평균으로 숨기지 않음, split과 boundary 분리                                          |
| 연속 점수+글자       | Big Five 차원 접근 + MBTI 기억 UX                            | 글자는 표현층이며 점수·오차가 원본                                                   |
| 빠른 결과 제한       | BFI-2 short-form 연구, 검사 표준                             | 적은 문항으로 facet 확정 금지                                                        |
| 한국어 상황 문항     | 번역·내용타당도·인지 인터뷰 방법론                           | 직역 금지, 사용자 이해·문화 편향 재검증                                              |
| HEXACO 코어 미포함   | HEXACO 6요인 연구                                            | 별도 상세검사 후보로 보존                                                            |

## 11. 앱에서 말할 수 있는 것과 아직 말하면 안 되는 것

현재 말할 수 있다:

- `MBTI·Big Five·BFAS·BFI-2 등 여러 연구를 비교해 뉴앙의 측정 범위를 설계했어요.`
- `유명 검사를 그대로 복사하지 않고, 측정하지 않은 능력과 장점을 결과에 붙이지 않도록 다시 정의했어요.`
- `뉴앙 코드는 연속 점수와 세부 성향을 기억하기 쉽게 요약한 표현이에요.`
- `현재 검사 버전과 검증 진행 상태를 공개해요.`

정량 검증 전에는 말하면 안 된다:

- `과학적으로 정확성이 입증된 검사예요.`
- `MBTI와 Big Five의 단점을 모두 해결했어요.`
- `어떤 사람에게나 정확해요.`
- `성격을 완벽하게 설명해요.`
- `코드만 알면 관계·직업·행복을 예측할 수 있어요.`
- `전문 심리검사나 진단을 대체해요.`

검증 후에도 근거가 있는 범위만 수치와 함께 공개한다.

## 12. 공식 사이트·전문 연구 목록

### 12.1 MBTI와 모델 대조

1. [Myers & Briggs Foundation — The Preferences](https://www.myersbriggs.org/my-mbti-personality-type/the-mbti-preferences/)  
   E/I·S/N·T/F·J/P의 공식 의미, 비우열적 선호 원칙.
2. [The Myers-Briggs Company — MBTI Facts](https://www.themyersbriggs.com/en-us/support/mbti-facts)  
   MBTI와 Big Five의 관계, Big Five Neuroticism이 MBTI 모델에 포함되지 않는다는 공식 설명.
3. [McCrae & Costa (1989), Reinterpreting the MBTI From the Perspective of the Five-Factor Model](https://doi.org/10.1111/j.1467-6494.1989.tb00759.x)  
   MBTI 네 지표와 FFM 영역의 경험적 관련성과 동일시의 한계.

### 12.2 Big Five·BFAS·BFI-2

4. [Berkeley Personality Lab — Big Five Inventory](https://www.ocf.berkeley.edu/~johnlab/bfi.html)  
   BFI/BFI-2 공식 연구자 자료, 채점·규준·번역·형식 관련 안내.
5. [Berkeley Personality Lab — Measures](https://www.ocf.berkeley.edu/~johnlab/measures)  
   BFI-2·BFI-2-S·BFI-2-XS와 번역 양식 목록.
6. [Colby College Personality Lab — BFI-2](https://www.colby.edu/academics/departments-and-programs/psychology/research-opportunities/personality-lab/the-bfi-2/)  
   저자 연구실의 BFI-2 5 domain·15 facet 자료.
7. [Soto & John (2017), The Next Big Five Inventory (BFI-2)](https://escholarship.org/uc/item/16x6n05t)  
   5 domain × 3 facet 위계 구조의 개발·검증.
8. [Soto & John (2017), BFI-2 Short and Extra-Short Forms](https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017b.pdf)  
   30문항·15문항 단축형의 정보 보존과 facet 해석 한계.
9. [DeYoung, Quilty, & Peterson (2007), Between Facets and Domains](https://pubmed.ncbi.nlm.nih.gov/17983306/)  
   Big Five 각 영역 아래 두 관련 aspect와 BFAS 개발.
10. [DeYoung et al. (2009), Intellect as Distinct From Openness](https://pmc.ncbi.nlm.nih.gov/articles/PMC2805551/)  
    Openness의 미적·지각적 관여와 Intellect의 지적 관여 구분.

### 12.3 관계·정서 영역 보조 연구

11. [DeYoung et al. (2013), Unifying the Aspects of the Big Five and the Interpersonal Circumplex](https://pubmed.ncbi.nlm.nih.gov/23126539/)  
    Extraversion·Agreeableness의 네 aspect와 대인 행동 구조의 관계.
12. [Jensen-Campbell & Graziano (2001), Agreeableness as a Moderator of Interpersonal Conflict](https://doi.org/10.1111/1467-6494.00148)  
    Agreeableness와 갈등 반응·전략·관계 결과의 다방법 연구.
13. [Larsen & Ketelaar (1989), Neuroticism and Extraversion in Affect Intensity](<https://doi.org/10.1016/0191-8869(89)90261-4>)  
    긍정 정서 강도와 부정 정서 강도에 Extraversion·Neuroticism이 다르게 관련될 수 있다는 근거.
14. [Gross (1998), Antecedent- and Response-Focused Emotion Regulation](https://pubmed.ncbi.nlm.nih.gov/9457784/)  
    감정 경험·행동 표현·생리 반응과 조절 시점의 구분.
15. [Horstmann et al. (2021), Assessing Personality States](https://doi.org/10.1002/per.2266)  
    상황별 성향 상태의 개인 내 변산, 신뢰도, 변별타당도 설계 기준.

### 12.4 대안 모델과 공개 문항

16. [HEXACO 공식 사이트 — Inventory](https://hexaco.org/hexaco-inventory)  
    여섯 broad dimension과 60·100·200문항 구조.
17. [HEXACO 공식 사이트 — History](https://hexaco.org/history)  
    여러 언어의 어휘 연구와 여섯 요인 모델 개발 배경.
18. [Ashton & Lee (2007), Advantages of the HEXACO Model](https://doi.org/10.1177/1088868306294907)  
    Honesty-Humility를 포함한 6요인 대안의 경험적·이론적 근거.
19. [International Personality Item Pool 공식 사이트](https://ipip.ori.org/)  
    공개 도메인 성격 문항·척도와 이용 조건.

### 12.5 검사 개발·타당화 방법론

20. [AERA — Standards for Educational and Psychological Testing](https://www.aera.net/Publications/Books/Standards-for----Educational-Psychological-Testing-2014-Edition)  
    AERA·APA·NCME 공동 검사 개발·해석·사용 표준.
21. [Boateng et al. (2018), Best Practices for Developing and Validating Scales](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2018.00149/full)  
    문항 개발·척도 개발·척도 평가의 단계별 방법.
22. [Clark & Watson (2019), Constructing Validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC6754793/)  
    구성개념 정의, 넓은 문항 풀, 인접 개념, 위계 구조, 수렴·변별타당도.
23. [COSMIN 공식 사이트](https://www.cosmin.nl/)  
    측정 도구의 내용타당도·신뢰도·측정오차·구조타당도 방법론.
24. [Terwee et al. (2018), COSMIN Content Validity Methodology](https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/)  
    관련성·포괄성·이해 가능성을 중심으로 한 내용타당도 기준.
25. [Drennan et al. (2022), Effective Questionnaire Design Using Cognitive Interviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC9524256/)  
    문항 이해·회상·판단·응답 선택 과정을 확인하는 인지 인터뷰 실무.

## 13. 유지 관리 규칙

- 새 연구를 설계 판단에 사용하면 이 원장에 `주장·한계·뉴앙 반영·비반영 범위`를 추가한다.
- 논문 제목이나 유명 기관 이름만 추가하지 않는다. 실제 제품 결정과 연결되지 않으면 참고 목록에 넣지 않는다.
- 연구 결과를 반대로 해석하거나 원문보다 넓게 주장하지 않는다.
- 앱에 공개하는 모든 연구 링크는 공식 기관·저자 연구실·저널·DOI·PubMed·PMC 같은 1차 출처를 우선한다.
- 문항 저작권·상표·라이선스는 타당성 근거와 별도로 관리한다.
- MBTI는 Myers-Briggs Type Indicator의 등록 상표이며, 뉴앙이 공식 MBTI 제품이거나 제휴됐다고 표시하지 않는다.
- `research_reference_ledger_version`을 페이지 하단과 내부 release metadata에 저장한다.
