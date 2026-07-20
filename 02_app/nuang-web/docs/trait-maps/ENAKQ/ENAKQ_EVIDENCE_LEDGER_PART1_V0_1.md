# ENAKQ Part 1 근거 원장

작성일: 2026-07-20 KST  
버전: `ENAKQ-EVIDENCE-LEDGER.part1.v0.1`  
연결 초안: `ENAKQ.map.v0.1-draft.part1`  
상태: `EVIDENCE_MAPPING_DRAFT`

## 1. 원장 사용 원칙

이 원장은 연구 제목을 많이 나열해 ENAKQ를 과학적으로 보이게 만드는 문서가 아니다. 각 사용자 문장이 실제로 무엇을 근거로 삼았고, 외부 연구가 지지하는 범위와 뉴앙이 별도로 검증해야 할 범위를 구분한다.

근거는 세 종류를 분리한다.

1. `외부 구성개념 근거`: 성격 영역과 세부 구조를 설명하는 연구
2. `뉴앙 매핑 근거`: 외부 구성개념을 뉴앙의 한국어 자리·문항에 연결한 내부 정의
3. `제품 문구 근거`: 사용자가 이해하고 안전하게 사용할 수 있는지 확인한 인지 인터뷰·파일럿

외부 구성개념 근거만 있고 뉴앙 매핑·제품 문구 근거가 없으면 운영 승인하지 않는다.

## 2. 근거 상태

| 상태 | 의미 | 운영 사용 |
|---|---|---|
| `EXTERNAL_SUPPORTED` | 외부 연구가 넓은 구성개념 또는 방법론을 지지 | 뉴앙 문장 직접 발행 불가 |
| `NUANG_MAPPED_PROVISIONAL` | 현재 뉴앙 정의와 문항에 잠정 연결 | 검토용 초안만 가능 |
| `COGNITIVE_REVIEW_REQUIRED` | 한국어 이해·오해·낙인 검토 필요 | 운영 불가 |
| `QUANT_VALIDATION_REQUIRED` | 뉴앙 점수와 claim의 관계 검증 필요 | 운영 불가 |
| `HOLD` | 직접 근거 부족 또는 과잉해석 위험 | 사용자 문장 제외 |
| `APPROVED` | 외부·내부·인지·정량·안전 게이트 통과 | 해당 버전에서 운영 가능 |

Part 1의 모든 claim은 아직 `APPROVED`가 아니다.

## 3. 외부 근거 목록

### `SRC-BFI2-2017`

- Soto, C. J., & John, O. P. (2017). The Next Big Five Inventory (BFI-2).
- DOI: [10.1037/pspp0000096](https://doi.org/10.1037/pspp0000096)
- 공개 원문: [UC eScholarship](https://escholarship.org/uc/item/16x6n05t)
- 직접 확인한 범위: 5개 domain 아래 15개 facet을 둔 위계 구조, self·peer criteria를 사용한 개발·검증, 응답 동의 경향 통제.
- 뉴앙 사용: 넓은 한 자리 아래 세부 성향을 따로 보존해야 한다는 구조적 선례.
- 제한: BFI-2 문항·미국 영어 표본의 결과는 뉴앙 한국어 문항의 타당성을 대신하지 않는다.

### `SRC-BFAS-2007`

- DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between Facets and Domains: 10 Aspects of the Big Five.
- DOI: [10.1037/0022-3514.93.5.880](https://doi.org/10.1037/0022-3514.93.5.880)
- 직접 확인한 범위: 각 Big Five domain 아래 관련되지만 구분되는 두 aspect의 구조.
- 뉴앙 사용: 교류 활력·먼저 표현하기, 실행·지속·질서·구조, 감정 동요·걱정·주저를 한 점수로 숨기지 않는 근거.
- 제한: 뉴앙의 모든 자리를 반드시 두 세부 성향으로 만들어야 한다는 뜻이 아니다.

### `SRC-IPC-2013`

- DeYoung, C. G., Weisberg, Y. J., Quilty, L. C., & Peterson, J. B. (2013). Unifying the Aspects of the Big Five, the Interpersonal Circumplex, and Trait Affiliation.
- DOI: [10.1111/jopy.12020](https://doi.org/10.1111/jopy.12020)
- 직접 확인한 범위: Extraversion의 Assertiveness·Enthusiasm과 Agreeableness의 Compassion·Politeness가 대인 행동 구조에서 구분되는 위치를 가짐. 세 표본에서 대인 행동 빈도와 성향 척도를 함께 검토.
- 뉴앙 사용: 먼저 표현하는 경향과 상대 마음에 관심이 가는 경향을 같은 특성으로 합치지 않음.
- 제한: 뉴앙 A는 Compassion이나 Agreeableness 전체가 아니라 RO-EC 관계 주의 방향으로 더 좁다.

### `SRC-EXTRAVERSION-PA-2015`

- Smillie, L. D., DeYoung, C. G., & Hall, P. J. (2015). Clarifying the Relation Between Extraversion and Positive Affect.
- DOI: [10.1111/jopy.12138](https://doi.org/10.1111/jopy.12138)
- 직접 확인한 범위: Extraversion·Assertiveness·Enthusiasm과 긍정 정서의 관계는 단순한 기분 좋음보다 높은 활성과 함께 해석할 필요가 있음.
- 뉴앙 사용: E를 행복함·낙천성으로 해석하지 않고 교류 활력과 표현 시작으로 좁히는 경계 자료.
- 제한: 뉴앙 SE-RE의 직접 타당화 자료가 아니다.

### `SRC-OPENNESS-INTELLECT-2009`

- DeYoung, C. G., Shamosh, N. A., Green, A. E., Braver, T. S., & Gray, J. R. (2009). Intellect as Distinct From Openness.
- 원문: [PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC2805551/)
- DOI: [10.1037/a0016615](https://doi.org/10.1037/a0016615)
- 직접 확인한 범위: Openness와 Intellect가 관련되지만 구분되는 aspect이며, Intellect와 인지 능력의 관련도 동일 구성개념을 뜻하지 않음.
- 뉴앙 사용: N 아래 미적 경험·상상 확장·지적 탐구를 나누고, 지적 탐구를 지능으로 해석하지 않음.
- 제한: 뉴앙의 3-facet 모형은 BFI-2 구조와 한국어 파일럿에서 별도 검증해야 한다.

### `SRC-STATE-DISTRIBUTION-2001`

- Fleeson, W. (2001). Traits as Density Distributions of States.
- DOI: [10.1037/0022-3514.80.6.1011](https://doi.org/10.1037/0022-3514.80.6.1011)
- 직접 확인한 범위: 경험표집 연구에서 개인 안의 일상 행동 변산이 크면서도 사람마다 행동 분포의 중심 경향은 안정적으로 구분될 수 있음.
- 뉴앙 사용: 코드가 있어도 상황에 따라 반대 방향 행동이 나타날 수 있다는 설명.
- 제한: ENAKQ의 특정 행동이나 뉴앙 다섯 자리의 변산 크기를 직접 제시하지 않는다.

### `SRC-WHOLE-TRAIT-2015`

- Fleeson, W., & Jayawickreme, E. (2015). Whole Trait Theory.
- PubMed: [PMID 26097268](https://pubmed.ncbi.nlm.nih.gov/26097268/)
- DOI: [10.1016/j.jrp.2014.10.009](https://doi.org/10.1016/j.jrp.2014.10.009)
- 직접 확인한 범위: 성향을 기술적 분포와 그 행동을 설명하는 사회인지 과정으로 함께 다루는 이론.
- 뉴앙 사용: 대표 코드와 상황별 실제 반응, 처음 드는 생각과 행동을 구분하는 설계 근거.
- 제한: 뉴앙의 화살표 과정 코드가 검증되었다는 근거가 아니다.

### `SRC-STATE-MEASUREMENT-2020`

- Horstmann, K. T., Rauthmann, J. F., Sherman, R. A., & Ziegler, M. (2020). Assessing Personality States.
- DOI: [10.1002/per.2266](https://doi.org/10.1002/per.2266)
- 직접 확인한 범위: 성향 상태 측정 목적, 문항 구성, 상태 표현과 일상 경험을 구분할 필요.
- 뉴앙 사용: 한 번의 행동으로 대표 코드를 단정하지 않고 과정 측정의 목적을 명확히 함.
- 제한: 현재 뉴앙 process pair의 변별타당성을 대신하지 않는다.

### `SRC-EMOTION-PROCESS-1998`

- Gross, J. J. (1998). Antecedent- and Response-Focused Emotion Regulation.
- PubMed: [PMID 9457784](https://pubmed.ncbi.nlm.nih.gov/9457784/)
- DOI: [10.1037/0022-3514.74.1.224](https://doi.org/10.1037/0022-3514.74.1.224)
- 직접 확인한 범위: 감정 경험, 표현, 생리 반응과 조절 시점을 구분해 살펴볼 필요.
- 뉴앙 사용: Q의 마음속 활성화와 실제 나타나는 반응을 동일하게 취급하지 않음.
- 제한: Q→C, 감정 숨김, 감정조절 능력을 현재 코드로 추정할 수 없다.

### `SRC-DYAD-2010`

- Dyrenforth, P. S., Kashy, D. A., Donnellan, M. B., & Lucas, R. E. (2010). Predicting Relationship and Life Satisfaction From Personality.
- PubMed: [PMID 20718544](https://pubmed.ncbi.nlm.nih.gov/20718544/)
- DOI: [10.1037/a0020385](https://doi.org/10.1037/a0020385)
- 직접 확인한 범위: 세 나라의 대규모 부부 표본에서 actor·partner·similarity 효과를 분리했으며, 성향 유사성은 actor·partner 효과 통제 뒤 관계·삶 만족 변량의 0.5% 미만을 설명.
- 뉴앙 사용: 같은 코드 수나 성향 유사성을 궁합 점수로 만들지 않음.
- 제한: 모든 관계 유형과 뉴앙 코드에 같은 효과 크기를 적용하지 않는다.

### `SRC-TEST-STANDARDS-2014`

- AERA, APA, NCME. Standards for Educational and Psychological Testing.
- 공식 안내: [AERA open-access release](https://www.aera.net/Newsroom/AERA-APA-and-NCME-Announce-the-Open-Access-Release-of-Standards-for-Educational-and-Psychological-Testing/mid/50388/dnnprintmode/true?SkinSrc=%5BG%5DSkins%2F_default%2FNo+Skin)
- 뉴앙 사용: 타당성을 검사 이름에 붙는 절대 인증이 아니라 특정 점수 해석과 사용을 지지하는 누적 근거로 관리.

### `SRC-ITC-2017`

- International Test Commission. Guidelines for Translating and Adapting Tests, 2nd ed.
- 공식 페이지: [ITC Guidelines](https://www.intestcom.org/page/14)
- 뉴앙 사용: 영어 원척도의 직역이 아니라 한국어·문화 적응, 개념 등가성, 검증 절차를 별도 수행.

### `SRC-BERKELEY-BFI`

- Berkeley Personality Lab. Big Five Inventory.
- 공식 페이지: [BFI/BFI-2 안내](https://www.ocf.berkeley.edu/~johnlab/bfi.html)
- 직접 확인한 범위: BFI-2에 공식 규준 매뉴얼이 없다는 안내, 번역에서 전체 의미와 역번역을 강조, 표준 5점 응답에서 중간 응답의 의미를 인정.
- 뉴앙 사용: 미국 규준을 뉴앙 백분위로 사용하지 않으며, 가운데 응답을 강제로 한쪽 글자로 확정하지 않음.

## 4. 뉴앙 내부 근거 목록

| Internal ID | 자료 | 역할 |
|---|---|---|
| `INT-CODE-SCHEME` | `next-code-scheme.ts` | E/I·R/N·G/A·K/M·C/Q 순서와 공개 facet |
| `INT-DIRECTION-COPY` | `candidate-profile-names.ts` | 열 글자의 현재 사용자 문구와 금지 해석 |
| `INT-RESEARCH-LEDGER` | `NUANG_RESEARCH_REFERENCE_AND_ADAPTATION_LEDGER.md` | 외부 연구를 뉴앙에 반영·제외한 추적 원장 |
| `INT-DETAIL-ARCH` | `NUANG_ALL_CODE_DETAIL_PROFILE_ARCHITECTURE.md` | facet map, process flow, private detail 구분 |
| `INT-ENAKQ-PROTOCOL` | `NUANG_ENAKQ_TRAIT_MAP_RESEARCH_PROTOCOL_V0_1.md` | ENAKQ 가설·검색·승인 기준 |
| `INT-SCORING` | `public-comparison-contract.ts` 및 scoring contract | 비율·경계·공개 비교 해석 범위 |

현재 내부 코드 체계의 measurement validation gate는 완료 상태가 아니다. 내부 자료는 정합성 근거이지 경험적 타당화 완료 증거가 아니다.

## 5. Claim 근거 매핑

| Claim ID | 외부 근거 | 내부 근거 | 현재 판정 | 남은 검증 |
|---|---|---|---|---|
| `ENAKQ.general.definition.E` | BFI2, BFAS, Extraversion-PA | CODE-SCHEME, DIRECTION-COPY | `NUANG_MAPPED_PROVISIONAL` | SE 한국어 구조·수렴·변별 |
| `ENAKQ.general.definition.N` | BFI2, BFAS, Openness-Intellect | CODE-SCHEME, DIRECTION-COPY | `NUANG_MAPPED_PROVISIONAL` | OE 3-facet 한국어 구조 |
| `ENAKQ.general.definition.A` | IPC-2013 간접 근거 | RO-EC item bank, DETAIL-ARCH | `QUANT_VALIDATION_REQUIRED` | Agreeableness 전체와 구분, G/A 요인 |
| `ENAKQ.general.definition.K` | BFI2, BFAS | SM construct, DETAIL-ARCH | `QUANT_VALIDATION_REQUIRED` | 2-vs-3 facet, 환경 오염 |
| `ENAKQ.general.definition.Q` | BFI2, BFAS | ER construct, DETAIL-ARCH | `QUANT_VALIDATION_REQUIRED` | 임상·긍정정서·SE와 변별 |
| `ENAKQ.general.role.opens` | IPC-2013 간접 근거 | E×A 가설 | `HOLD` | 조합 효과·인지 인터뷰 |
| `ENAKQ.general.role.conductor` | 직접 근거 없음 | E×N×K 제품 가설 | `HOLD` | 역할명 이해·통합 효과 |
| `ENAKQ.general.inner.A` | 상태·과정 방법론 | RO-EC process pilot | `QUANT_VALIDATION_REQUIRED` | thought/action 분리 |
| `ENAKQ.general.response.AG` | 상태·과정 방법론 | RO-EC process pilot | `HOLD` | 반복 상황 process evidence |
| `ENAKQ.general.response.AA` | 상태·과정 방법론 | RO-EC process pilot | `HOLD` | 반복 상황 process evidence |
| `ENAKQ.general.q.activation` | BFI2, BFAS | ER-WD·ER-IR | `NUANG_MAPPED_PROVISIONAL` | 한국어 ER 구조·준거 |
| `ENAKQ.general.q.expression` | Emotion Process 1998 | DETAIL-ARCH | `COGNITIVE_REVIEW_REQUIRED` | Q→C 별도 측정·안전성 |
| `ENAKQ.partner.similarity` | DYAD-2010 | 비교 가드레일 | `EXTERNAL_SUPPORTED_BOUNDARY` | 친구·가족·업무 확장 검토 |
| `ENAKQ.stress.worry` | BFI2, BFAS | ER-WD·상황 맥락 가설 | `QUANT_VALIDATION_REQUIRED` | 걱정의 빈도·강도·상황별 증분타당도 |
| `ENAKQ.stress.recovery` | 직접 공통 처방 근거 없음 | 후속검사 후보 | `HOLD` | 개인 지원 선호 데이터 |
| `ENAKQ.boundary.variability` | STATE-2001, WTT, State Measurement | scoring boundary | `NUANG_MAPPED_PROVISIONAL` | 뉴앙 반복측정 자료 |

## 6. 문단 블록 추적

초안의 HTML 주석 `block`은 화면에는 보이지 않지만 문단의 근거를 역추적한다.

| Block | 주요 claim | 근거 묶음 | 중복 허용 이유 |
|---|---|---|---|
| `ENAKQ-P1-01` | 다섯 definition | BFI2+뉴앙 자리 정의 | 첫 전체 요약에서만 짧게 사용 |
| `ENAKQ-P1-02` | variability·boundary | STATE-2001, WTT, BERKELEY | 코드 읽는 법 전용 |
| `ENAKQ-P1-03` | role opens·conductor | IPC 간접+내부 가설 | 장점 확정이 아닌 가설 소개 |
| `ENAKQ-P1-04` | Q activation·expression | BFI2, Gross | Q를 누락하지 않는 전체 안내 |
| `ENAKQ-P1-05` | similarity·recovery | DYAD-2010 | 궁합 결정론 차단 |
| `ENAKQ-P2-01` | role opens | IPC 간접+E/A 정의 | 역할명 해설 전용 |
| `ENAKQ-P2-02` | role conductor | 내부 제품 가설 | 리더십 오해 차단 전용 |
| `ENAKQ-P2-03` | Q activation·stress | ER 정의 | 역할명의 긍정 편향 교정 |
| `ENAKQ-P2-04` | variability | WTT+세부 성향 구조 | 역할명 반례 설명 전용 |
| `ENAKQ-P3-E-*` | definition E·variability | BFI2, BFAS, Smillie | E 세부 설명의 canonical 위치 |
| `ENAKQ-P3-N-*` | definition N·variability | BFI2, DeYoung 2009 | N 세부 설명의 canonical 위치 |
| `ENAKQ-P3-A-*` | definition A·process | IPC, 뉴앙 RO-EC | A 세부·과정의 canonical 위치 |
| `ENAKQ-P3-K-*` | definition K·variability | BFI2, BFAS | K 세부 설명의 canonical 위치 |
| `ENAKQ-P3-Q-*` | definition Q·expression | BFI2, Gross | Q 세부 설명의 canonical 위치 |
| `ENAKQ-P3-ALL-01` | variability·composition | WTT+내부 구조 | 통합 읽는 법 전용 |

같은 claim이 여러 블록의 근거로 연결될 수 있지만, 운영 화면의 한 뷰에서는 `contentKey` 기준으로 같은 의미를 한 번만 렌더한다. 장문 원문에서는 요약과 상세의 정보 깊이가 달라야 하며 동일 문장 재사용은 금지한다.

## 7. 현재 제외한 표현

아래 표현은 Part 1에서 사용하지 않는다.

- 사람의 마음을 잘 읽는 타고난 리더
- 누구와도 쉽게 친해지는 유형
- 아이디어를 현실로 만드는 뛰어난 기획자
- 책임감이 강하고 맡은 일은 반드시 끝내는 사람
- 감수성이 풍부하고 공감 능력이 뛰어난 사람
- 걱정이 많지만 회복력도 좋은 사람
- ENAKQ끼리는 서로 잘 맞는다
- ENAKQ와 특정 코드는 궁합이 나쁘다
- 속으로는 Q이지만 겉으로는 항상 C다

이 표현들은 능력·도덕·진단·과정·궁합을 현재 측정 범위보다 넓게 추론한다.

## 8. Part 1 승인 전 남은 근거 작업

1. ENAKQ 선명형·경계형·facet split형의 실제 fixture를 만들어 문구 적합성을 비교한다.
2. `지휘자`가 리더십·지시·권한으로 읽히는지 2030 한국어 사용자 인지 인터뷰를 한다.
3. A 설명을 공감 능력·착함으로 읽는 비율과 대체 문구를 확인한다.
4. K 설명에서 성실·책임·게으름의 가치 판단이 생기는지 확인한다.
5. Q 설명에서 예민함·정신질환·감수성으로의 오해를 확인한다.
6. Part 1 각 문단의 자기일치도와 함께 `과도하게 단정한다고 느끼는 정도`를 별도 측정한다.
7. 외부 성격 전문가 blind review에서 claim이 어느 구성개념을 말하는지와 금지 추론을 점검한다.
8. 뉴앙 내부 정량 파일럿 전에는 모든 claim 상태를 `APPROVED`로 올리지 않는다.
