# v2.3 근거 출처 의존성 감사

- 등록 출처: 41
- 고위험 출처 조합: 180
- 의존성 메타데이터 완성 출처: 0
- 독립 확인 조합: 0
- 고위험 문장 독립 출처 확인: 0/460

기존 605개 문장의 source ID·finding 계보는 구조적으로 통과했다. 그러나
현재 출처 객체에는 `studyFamilyId`, dataset·sample ID, secondary
analysis 관계, 독립성 검토자와 검토 시각이 없다. 따라서 서로 다른
source ID 두 개를 곧바로 “독립 연구 두 개”로 세지 않는다.

저자가 겹치는 조합은 6개지만,
저자 겹침만으로 자료 의존성을 확정하지 않는다. DOI, 실제 표본,
공유 데이터셋·코호트, 재분석 관계를 원문과 부록에서 확인해야 한다.

작성용 원장:
`review/TRAIT_MAP_EVIDENCE_DEPENDENCE_REGISTRY_TEMPLATE_V2_3.json`

고위험 문장 사용량이 많은 출처부터 채우고, 독립 근거가 부족한 문장은
범위를 좁히거나 추가 근거를 찾거나 hold한다. 방법론 문서를 결과
연구로 제외했을 때 2개 결과 근거가 부족한 고위험 문장은
31개이며, JSON의
`substantiveGapQueue`에 정확한 canonical ID와 조치가 기록돼 있다.
