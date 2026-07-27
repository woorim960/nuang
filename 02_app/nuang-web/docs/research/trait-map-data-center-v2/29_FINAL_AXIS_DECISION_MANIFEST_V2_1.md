# 뉴앙 성향지도 최종 축 판정 manifest v2.1

- 상태: `V2_1_RESEARCH_REBUILD_BASELINE_READY_SEVEN_ROLE_REVIEW_PENDING`
- 고객 발행: `research_only`
- v2 감사 기준선 보존: 예

## 수정 결과

- 전체 claim 슬롯: 288
- 수정 슬롯: 2
- 변경 없는 슬롯: 286
- canonical variant: 713 → 705
- 제거한 미지원 변형: 8
- 구조 오류: 0

| claim                                         | v2 축    | v2.1 축 | v2.1 변형 수 |
| --------------------------------------------- | -------- | ------- | -----------: |
| `.scenario.general.new_encounter.response`    | SE·OE·ER | SE·OE   |            4 |
| `.scenario.general.ordinary_choice.attention` | OE·RO·SM | OE·SM   |            4 |

v2.1은 단어 단서로 잘못 추가된 두 축만 제거한 새 연구 초안 기준선이다. 기존
v2 원장과 영향 감사 파일은 판단 계보를 재현할 수 있도록 그대로 보존한다.

## 다음 작업

1. drafting queue를 v2.1 manifest로 다시 생성한다.
2. CAB-01의 병합 대상 8개 문장을 4개 의미 보존 문장으로 교정한다.
3. CAB-02~12의 ID와 내용이 예상 밖으로 바뀌지 않았는지 확인한다.
4. 32개 프로필 9,216개 참조와 80개 한 글자 이웃을 다시 감사한다.
