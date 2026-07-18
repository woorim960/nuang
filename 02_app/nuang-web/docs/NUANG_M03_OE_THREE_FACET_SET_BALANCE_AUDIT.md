# NUANG M03-OE 3-facet 후보 세트 균형 감사

작성일: 2026-07-17 KST  
문서 상태: `OWNER_APPROVED_FOR_M04_RESEARCH_DESIGN`  
측정 상태: `PROVISIONAL_NOT_FOR_SCORING_OR_RELEASE`  
감사 대상: OE-AE·OE-CI·OE-IE 후보 36문항  
감사 기준 버전: `m03-oe-set-audit.v0.1`  
이번 단계에서 하지 않는 일: 후보 삭제·최종 선정, 점수 계산, R/N 발급, seed 수정, DB migration, 운영 배포

관련 문서:

- [NUANG_M01_OE_CONSTRUCT_DEFINITION.md](./NUANG_M01_OE_CONSTRUCT_DEFINITION.md)
- [NUANG_M02_ITEM_AND_RESPONSE_SPEC.md](./NUANG_M02_ITEM_AND_RESPONSE_SPEC.md)
- [NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md)
- [NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md)
- [NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md](./NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md)
- [NUANG_FINAL_CODE_SEMANTIC_AUDIT.md](./NUANG_FINAL_CODE_SEMANTIC_AUDIT.md)

## 0. 감사 결론

OE의 세 facet은 정의와 핵심 반응 수준에서 구분 가능하다.

```text
OE-AE 미적 경험
실제로 접한 장면·소리·공간이 주는 분위기와 인상에 관심이 머무는가?

OE-CI 상상 확장
주어진 내용 바깥의 장면·이야기·가능성을 새로 이어서 떠올리는가?

OE-IE 원리와 관점 알아보기
개념·이유·배경·서로 다른 설명을 필요한 범위보다 더 알아보는가?
```

36문항의 수량·방향·후보 상태는 균형을 이룬다. 그러나 바로 점수화할 수 있는 세트는 아니다.

핵심 위험은 다섯 가지다.

1. OE-AE는 시각 경험, OE-IE는 디지털·읽기·검색 경험에 상대적으로 치우쳐 있다.
2. 영화·공간·`떠올리다` 같은 유사 자극과 동사가 facet 사이에 반복된다.
3. 부정문 3개와 `~만·~까지만` 제한 표현 9개가 모두 LOW 방향에 몰려 있다.
4. HIGH는 감수성·창의성·지성처럼 좋아 보이고 LOW는 현실성·효율성처럼 좋아 보일 수 있다.
5. N 방향은 세 facet의 적극적 관심으로 직접 관찰하지만, R 설명은 낮은 OE에서 상대적으로 추론하므로 고객 문구의 수렴타당도를 별도로 확인해야 한다.

현재 판정은 `PASS_FOR_EXPERT_AND_COGNITIVE_REVIEW`다. 빠른·정밀 문항 선정과 R/N 점수화는 계속 `NOT_READY`다.

## 1. 36문항 인벤토리 검증

| facet | 고객 명칭 | 전체 | HIGH | LOW | 주력 | 탐색 |
|---|---|---:|---:|---:|---:|---:|
| OE-AE | 분위기와 아름다움 느끼기 | 12 | 6 | 6 | 8 | 4 |
| OE-CI | 장면과 이야기 떠올리기 | 12 | 6 | 6 | 8 | 4 |
| OE-IE | 원리와 관점 알아보기 | 12 | 6 | 6 | 8 | 4 |
| 합계 | 생각과 탐색 | 36 | 18 | 18 | 24 | 12 |

추가 검증:

- 고유 후보 ID: 36개
- 상황 버킷: 18개
- 동일 상황의 HIGH/LOW 쌍: 18쌍
- facet 사이 완전히 같은 `contextLabel`: 0개
- 상황 라벨 40자 초과: 0개
- 질문 문장 70자 초과: 0개

동일 상황의 두 방향은 후보 생성을 위한 의도된 쌍이다. 같은 사용자 form에는 함께 넣지 않는다.

## 2. 세 facet의 의미 경계

| 구분 질문 | OE-AE | OE-CI | OE-IE |
|---|---|---|---|
| 관심의 대상 | 실제 장면·소리·공간의 분위기와 인상 | 아직 주어지지 않은 장면·이야기·가능성 | 개념·이유·배경·대안 설명 |
| 핵심 반응 | 관심이 머물고 인상을 곱씹음 | 새 장면이나 전개를 덧붙임 | 뜻·근거·연결을 더 알아봄 |
| 결과물 필요 | 없음 | 없음 | 없음 |
| 능력 평가 | 감각 정확도·예술 능력 제외 | 창의성·심상 선명도 제외 | 지능·정답률·비판적 사고 능력 제외 |
| 가장 가까운 오염 | ER 감정 강도·감각 접근 | 걱정·계획·주의 산만 | SM 지속·RO 존중·지식·검색 접근 |

문항이 아래 질문 중 하나에만 명확히 답하지 못하면 수정 또는 제외한다.

```text
실제 인상에 머문 것인가?
없는 장면을 새로 만든 것인가?
이유와 설명을 더 알아본 것인가?
```

## 3. cross-facet 경계 위험

### 3.1 우선 비교해야 할 seam

| 비교 | 겹치는 표면 | 실제로 분리해야 할 반응 | 위험 판정 |
|---|---|---|---|
| AE-C01·C02 ↔ CI-C03·C04 | 일상의 시각 장면 | 색·빛의 인상에 관심 vs 다른 장면 생성 | `COGNITIVE_SEAM_TEST` |
| AE-C07·C08 ↔ CI-C05·C06 | 공간 | 실제 공간의 분위기 vs 설명된 공간의 모습 생성 | `COGNITIVE_SEAM_TEST` |
| AE-C09·C10 ↔ CI-C09·C10 | 영상·미디어 장면 | 장면의 인상 관여 vs 장면 앞뒤 이야기 생성 | `HIGH_PRIORITY_SEAM_TEST` |
| AE-C11·C12 ↔ CI-C01·C02 | 다시 떠올림 | 실제 인상 회상 vs 아직 나오지 않은 장면 생성 | `HIGH_PRIORITY_SEAM_TEST` |
| AE-C11·C12 ↔ CI-C11·C12 | 관심의 지속 | 실제 느낌 재관여 vs 새 가능성 연쇄 | `HIGH_PRIORITY_SEAM_TEST` |
| CI-C07·C08 ↔ IE-C05·C06 | 여러 가능성 | 가정 속 장면 전개 vs 설명의 근거 비교 | `BLIND_MAPPING` |
| CI-C11·C12 ↔ IE-C09·C10 | 연결·이어짐 | 이야기성 후속 장면 vs 기존 정보와 새 설명의 관계 | `HIGH_PRIORITY_SEAM_TEST` |

### 3.2 유지 조건

- 전문가가 target facet을 보지 않고도 첫 번째 후보를 일관되게 맞힌다.
- 사용자가 각 문항에서 떠올린 실제 반응을 자기 말로 설명할 수 있다.
- OE-AE 응답 이유에 `새 이야기를 만들었다`가 반복되지 않는다.
- OE-CI 응답 이유에 `왜 그런지 찾아봤다`가 반복되지 않는다.
- OE-IE 응답 이유에 `정답을 맞혔다`, `이해를 잘했다`가 반복되지 않는다.
- 확인적 요인분석과 문항반응 분석에서 target 외 facet의 교차 적재가 사전 기준을 넘지 않는다.

통과 기준의 수치는 결과를 보기 전에 M04 검토 계획에서 심리측정 책임자가 사전 등록한다.

## 4. 상황·매체·접근성 균형

| facet | 현재 주요 방식 | 현재 분포 | 세트 위험 |
|---|---|---|---|
| OE-AE | 시각·공간, 청각, 복합 인상 | 시각·공간 8문항, 청각 2문항, 복합 2문항 | 시각 접근·자연·공간 경험에 점수가 좌우될 수 있음 |
| OE-CI | 이야기·가정, 시각 장면, 설명된 공간 | 이야기·개념 6문항, 시각·미디어 4문항, 공간 2문항 | 시각 심상·미디어 선호가 상상 관여로 오인될 수 있음 |
| OE-IE | 생활용품, 영상·대화, 인터넷 글, 앱 규칙, 검색 | 명시적 디지털·읽기·검색 6문항, 대화·영상 4문항, 생활용품 2문항 | 교육·디지털 접근·검색 습관이 탐구 관심으로 오인될 수 있음 |

필수 조치:

1. 시각 중심 OE-AE 문항에는 청각·촉각·공간의 동등 후보를 비교한다.
2. OE-CI는 이미지·말·이야기 어느 방식으로 떠올려도 응답할 수 있게 한다.
3. OE-IE는 인터넷 글·앱·검색과 기능이 동등한 대화·듣기 상황 후보를 마련한다.
4. 특정 방식의 경험 부족을 LOW나 3점으로 대체하지 않는다.
5. `exposure_prerequisite`, `access_modality`, `no_experience_reason`을 파일럿 데이터에 보존한다.
6. 접근 방식별 문항 기능 차이와 DIF를 확인하기 전 대체 문항을 동등하다고 부르지 않는다.

## 5. 문장 형식과 방향 방법효과

### 5.1 발견된 비대칭

| 형식 | OE-AE | OE-CI | OE-IE | 합계 | 방향 |
|---|---:|---:|---:|---:|---|
| 직접 부정문 | 0 | 1 | 2 | 3 | 모두 LOW |
| `~만·~까지만` 제한 표현 | 0 | 5 | 4 | 9 | 모두 LOW |

직접 부정문:

- OECI-C10
- OEIE-C06
- OEIE-C12

부정문은 사용자 검토에서 더 명확하다고 판단된 경우 유지했다. 그러나 문장이 이해하기 쉽다는 것과 다른 문항과 같은 방식으로 점수가 작동한다는 것은 별도 문제다.

### 5.2 처리 원칙

- HIGH에 억지 부정문을 추가해 숫자만 맞추지 않는다.
- LOW의 직접형과 긍정형 대안을 A/B 인지 인터뷰로 비교한다.
- 후보 데이터에 `wording_polarity = affirmative | limiter | negated`를 기록한다.
- 부정문 이해 오류, 응답 시간, 응답 수정률, 방향별 방법 요인을 확인한다.
- 부정문이 target facet보다 하나의 공통 요인으로 묶이면 해당 문구를 수정하거나 제외한다.
- 세 개 인지 form에 직접 부정문을 하나씩 배치해 특정 form과 부정문 효과가 겹치지 않게 한다.

## 6. HIGH·LOW와 R/N의 대칭성 감사

### 6.1 확인된 장점

- 모든 facet이 HIGH 6개·LOW 6개다.
- LOW 후보는 `능력이 없다`가 아니라 관심이 현재 인상·주어진 장면·필요한 정보 범위에서 멈추는 반응을 사용한다.
- 현재 후보 문장에는 `현실적`, `실용적`, `효율적`, `지능이 낮다` 같은 가치 판단이 없다.

### 6.2 남은 구조 위험

N은 아래 세 적극적 관심을 직접 관찰한다.

- 분위기와 아름다움에 관심이 머묾
- 새로운 장면과 이야기를 이어서 떠올림
- 원리·배경·다른 설명을 더 알아봄

반면 R의 고객 설명인 `익숙하고 구체적인 것에 관심`은 대부분 LOW 응답에서 상대적으로 해석한다. 현재 세트가 직접 증명하는 것은 `N 관련 탐색이 상대적으로 적다`에 더 가깝다.

따라서 아래 단정을 금지한다.

```text
OE 점수가 낮음
→ 현실 감각이 좋음
→ 실용적임
→ 구체적인 것을 더 잘 다룸
```

허용 가능한 잠정 설명:

```text
새롭거나 추상적인 내용을 더 펼쳐보는 것보다,
지금 접한 내용과 필요한 범위에 관심이 머무는 편이에요.
```

### 6.3 R 설명 검증 계획

새로운 R facet을 임의로 추가하지 않는다. 대신 파일럿의 비채점 검증으로 다음을 확인한다.

1. OE 점수가 낮은 holdout 사용자가 위 R 잠정 설명에 실제로 공감하는가?
2. 이 공감이 SM의 질서·실행, 지능·학력, 직업·디지털 접근 때문은 아닌가?
3. OE-AE·OE-CI·OE-IE가 서로 다른 분리 프로필에서도 R 한 글자 설명이 과장되지 않는가?
4. 낮은 점수가 접근성·경험 부족·전반적 무응답 때문일 때 R을 발급하지 않는가?
5. R 문구 적합성이 확인되지 않으면 `R/N이 비슷해요` 또는 `더 확인이 필요해요`를 우선하는가?

이 검증은 R을 위한 새 점수 문항이 아니라 코드 해석 문구의 수렴타당도 확인이다.

## 7. 사회적 바람직성과 고객 인상

| facet | HIGH가 좋아 보이는 방식 | LOW가 좋아 보이는 방식 | 확인 질문 |
|---|---|---|---|
| OE-AE | 감수성·교양·세련됨 | 실용적·감정에 휘둘리지 않음 | 어느 답이 더 좋은 사람처럼 보였는가? |
| OE-CI | 창의적·상상력이 뛰어남 | 현실적·집중력이 좋음 | 어느 답이 더 능력 있어 보였는가? |
| OE-IE | 똑똑함·비판적·열린 사람 | 효율적·핵심만 파악함 | 어느 답이 더 지적이거나 유능해 보였는가? |

제품·연구 처리:

- 검사 화면에서 HIGH/LOW·N/R 방향을 보여주지 않는다.
- 한 방향을 칭찬하는 아이콘·색·캐릭터 반응을 사용하지 않는다.
- 결과 문구에서 양쪽에 장점을 억지로 붙이지 않고 관찰된 관심 범위만 설명한다.
- 인지 인터뷰에서 각 문항의 `좋아 보이는 답`을 5점으로 별도 평정한다.
- 바람직성 평정이 높고 응답 분포까지 왜곡하는 문항은 수정 또는 제외한다.

## 8. 같은 쌍·유사 자극 제시 규칙

- 같은 상황의 HIGH/LOW 쌍을 한 사용자 form에 함께 넣지 않는다.
- 유사한 자극을 쓰는 cross-facet seam 문항은 같은 form에 둘 수 있지만 바로 이어서 제시하지 않는다.
- 최소 두 개의 다른 facet·상황 문항을 사이에 둔다.
- facet별 문항을 한 묶음으로 제시하지 않고 교차 배치한다.
- 첫 문항·마지막 문항에 특정 facet이나 방향이 반복되지 않도록 순서를 교차한다.
- 실제 파일럿에서는 constrained randomization 또는 Latin-square 순서를 사용한다.
- 동일한 문구 A/B는 같은 사람에게 둘 다 보여 점수 일관성을 만들지 않고 표본을 분할한다.

## 9. 36문항 인지 인터뷰용 균형 form

세 form은 점수 비교용이 아니라 문장 이해·오염·접근성·facet 경계 확인용이다.

| Form | OE-AE 4개 | OE-CI 4개 | OE-IE 4개 |
|---|---|---|---|
| A | C01·C04·C09·C12 | C01·C07·C04·C10 | C07·C11·C10·C02 |
| B | C03·C07·C02·C06 | C05·C03·C12·C08 | C09·C03·C08·C06 |
| C | C05·C11·C08·C10 | C11·C09·C06·C02 | C05·C01·C04·C12 |

각 form의 검증된 균형:

| 검사 | Form A | Form B | Form C |
|---|---:|---:|---:|
| 전체 문항 | 12 | 12 | 12 |
| facet별 문항 | 4·4·4 | 4·4·4 | 4·4·4 |
| HIGH / LOW | 6 / 6 | 6 / 6 | 6 / 6 |
| 주력 / 탐색 | 8 / 4 | 8 / 4 | 8 / 4 |
| 같은 HIGH/LOW 쌍 동시 포함 | 0 | 0 | 0 |
| 직접 부정문 | 1 | 1 | 1 |

의도적으로 포함한 seam:

- Form A: 미디어 인상 AE-C09와 미디어 이야기 CI-C10
- Form B: 실제 공간 분위기 AE-C07과 설명된 공간 상상 CI-C05
- Form C: 실제 인상 재관여 AE-C11과 가능성 연쇄 CI-C11

seam 문항은 같은 form 안에서 최소 두 문항 이상 떨어뜨려 제시한다.

## 10. 전문가 검토와 인지 인터뷰 출력

### 전문가 blind mapping

각 문항마다 다음을 받는다.

- 첫 번째 facet, 두 번째 facet, 어느 facet에도 맞지 않음
- HIGH/LOW 방향
- 능력·접근성·문화·바람직성·인접 성향 오염
- 수정 없이 사용 / 수정 후 사용 / 제외
- 수정 제안과 그 수정이 바꾸는 구성개념

### 사용자 인지 인터뷰

각 문항마다 다음을 기록한다.

- 실제 떠올린 상황
- 질문을 자기 말로 다시 설명한 내용
- 응답 근거가 관심·능력·필요·시간·접근 중 무엇이었는지
- 더 좋아 보인 방향과 그 이유
- 낯선 단어·모호한 범위·부정문 방향 혼동
- `판단하기 어려움` 이유

### 세트 종료 질문

1. 분위기 관심, 이야기 상상, 이유 알아보기가 서로 다른 질문으로 느껴졌는가?
2. 비슷한 질문이 반복된다고 느낀 문항은 무엇인가?
3. 특정 매체·취미·학력·기기 사용 경험이 있어야 답할 수 있었는가?
4. 어느 영역의 HIGH가 가장 좋은 성향처럼 보였는가?
5. LOW 답을 고를 때 현실적·효율적이라는 자기평가를 사용했는가?

## 11. 파일럿 전 데이터 계약

문항 본문 외에 최소 다음 필드를 보존한다.

- `facet_id`
- `candidate_id`
- `direction`
- `candidate_status`
- `situation_bucket`
- `wording_polarity`
- `response_process = interest | search_behavior | comparison | imagery | attention`
- `access_modality`
- `exposure_prerequisite`
- `no_experience_reason`
- `form_id`
- `order_index`
- `copy_variant_id`
- `response_latency_ms` — 연구 동의·최소 수집 원칙 적용
- `response_changed`

이 필드는 운영 DB migration 지시가 아니다. M04 연구 데이터 스키마 설계의 입력 사양이다.

## 12. 최종 판정

| 감사 항목 | 판정 |
|---|---|
| facet별 후보 수 | `PASS` |
| HIGH/LOW 수량 균형 | `PASS` |
| 주력/탐색 비율 | `PASS` |
| 정의 수준 facet 구분 | `PASS_FOR_BLIND_REVIEW` |
| cross-facet 문항 구분 | `REQUIRES_SEAM_TEST` |
| 시각·디지털·읽기 접근 균형 | `REQUIRES_ACCESSIBILITY_AND_DIF_TEST` |
| LOW 제한 표현·부정문 방법효과 | `REQUIRES_METHOD_TEST` |
| N/R 사회적 바람직성 | `REQUIRES_COGNITIVE_AND_PILOT_TEST` |
| R 고객 설명의 직접 근거 | `REQUIRES_REPORT_COPY_CONVERGENCE_TEST` |
| 3개 인지 form 구조 | `PASS_FOR_RESEARCH_USE` |
| 빠른·정밀 최종 문항 선정 | `NOT_READY` |
| R/N 코드 발급 | `BLOCKED` |

## 13. 사용자 승인 기록

2026-07-17 사용자 승인으로 다음 다섯 항목을 확정했다. OE 후보 생성 단계를 닫고 M04 전문가 blind mapping·인지 인터뷰 실행 사양으로 이동한다.

1. 세 facet 정의와 36문항을 전문가·인지 인터뷰 입력 후보로 유지한다.
2. cross-facet seam 문항은 삭제하지 않고 구분 타당성을 우선 검증한다.
3. LOW의 제한 표현 9개와 직접 부정문 3개를 방법효과 검증 대상으로 표시한다.
4. R은 새 facet을 추가하지 않고 낮은 OE와 고객 설명의 수렴타당성을 비채점 방식으로 확인한다.
5. 세 개 균형 form을 연구용으로 사용하되 아직 점수·코드·운영 DB에는 연결하지 않는다.

## 14. 근거 자료

- [Soto & John (2017), The Next Big Five Inventory](https://escholarship.org/uc/item/16x6n05t) — Open-Mindedness 아래 Aesthetic Sensitivity·Creative Imagination·Intellectual Curiosity의 3-facet 구조
- [DeYoung et al. (2009), Intellect as Distinct From Openness](https://pmc.ncbi.nlm.nih.gov/articles/PMC2805551/) — Openness와 Intellect 구분 및 능력 문항 오염 검토 근거
- [DeYoung, Quilty, & Peterson (2007), Between Facets and Domains](https://pubmed.ncbi.nlm.nih.gov/17983306/) — Big Five 영역과 aspect의 위계 구조
- [Clark & Watson (2019), Constructing Validity](https://pmc.ncbi.nlm.nih.gov/articles/PMC6754793/) — 내용 범위·인접 구성개념·방법효과·교차타당화 원칙
- [Drennan et al. (2022), Cognitive Interviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC9524256/) — 문항 이해·회상·판단·응답 선택을 확인하는 인지 인터뷰 방법
