# v2.3 통계 엔진·모형 식별 사양

## 엔진 선택

5점 문항은 순서형으로 지정하고 주 분석은 `lavaan` WLSMV로 실행한다.
`simsem`은 구조 모형 회수, `mirt`는 문항 정보·다차원 IRT·DIF,
`semTools`는 모형 기반 신뢰도·동일성 보조 분석에 사용한다.

공식 자료:

- lavaan categorical: https://lavaan.ugent.be/tutorial/cat.html
- simsem CRAN: https://cran.r-project.org/package=simsem
- mirt CRAN: https://cran.r-project.org/package=mirt
- semTools CRAN: https://cran.r-project.org/package=semTools

## 식별 감사

| 모형                     | 상태                                                   | 판단                                                                                                                          |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| M1_TEN_CORRELATED_FACETS | READY_FOR_SIMULATION_AND_EMPIRICAL_FIT                 | 10개 세부 성향을 각각 6문항으로 측정하고 모든 세부 성향 상관을 추정한다.                                                      |
| M2_FIVE_CORRELATED_AXES  | READY_AS_COARSE_COMPARATOR                             | 세부 성향을 접고 5개 축으로 직접 적재한다. 단순하지만 세부 구조를 잃는 비교 모형이다.                                         |
| M3_PARTIAL_SECOND_ORDER  | BLOCKED_IDENTIFICATION_AND_THEORY_CONSTRAINTS_REQUIRED | OE는 세 개의 1차 요인이 있으나 SE·SM·ER은 두 개, RO는 한 개뿐이다. 임의의 동일성 제약 없이 동일한 2차 구조를 강요하지 않는다. |
| M4_TARGET_ESEM           | ENGINE_AND_ROTATION_SPEC_REQUIRED                      | 작은 교차적재를 허용하되 목표 회전·허용 범위·확인 표본 재현 규칙을 먼저 잠가야 한다.                                          |
| M5_REVERSE_METHOD_FACTOR | READY_AS_SENSITIVITY_MODEL                             | 10개 세부 성향에 역문항 방법 요인을 직교로 추가한다. 방법 요인이 강하면 문항 문구를 우선 점검한다.                            |

M3를 보류한 이유는 데이터가 나빠서가 아니다. OE는 세 세부 성향이지만
SE·SM·ER은 두 개, RO는 한 개뿐이므로 동일한 2차 요인 구조를 임의로
강요하면 모형 식별을 위해 근거 없는 동일성 제약을 넣게 된다.

## 생성된 실행 자산

- `analysis/trait-map-v2-3/ordinal_model_manifest.json`
- `analysis/trait-map-v2-3/run_ordinal_cfa.R`

현재 환경에는 Rscript와 패키지가 없어 runner를 실행하지 않았다.
실행 결과나 타당성 승인을 가장하지 않으며, 첫 실행 때 `renv.lock`과
`sessionInfo()`를 함께 고정한다.
