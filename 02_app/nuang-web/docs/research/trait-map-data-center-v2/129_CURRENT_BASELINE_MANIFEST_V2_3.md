# v2.3 현재 연구 기준선 manifest

## 구축 상태

- canonical 문장: 605
- 32개 성향 참조: 9216
- 개인화 후보 / COMMON: 544 / 61
- 한 글자 이웃: 80/80
- 구조적 근거 추적: 605 통과, 0 실패
- 맥락 감사: 605개 canonical·2939개 연결
- 미확립 맥락 전이 / 동일 맥락 finding 없음: 1321 / 101
- P0 직접 검증: 6개 모듈 설계, 실제 실행 0개
- 추적·해시한 산출물: 312
- 전체 재현 검사: 157
- 연구 원장 완료 기준: 10/10, 차단 0

## 완료와 미완료의 구분

내부 구조·재조합·근거 ID 추적, 검토 패킷, 인지 면담 계획, 정량 분석
계획과 runner는 준비됐다. 그러나 독립 검토자 0명, 인지 면담 참여자 0명,
실제 정량 분석 0건, 고객 발행 승인 0건이다. 합성 자료와 Node 하네스는
실행 준비를 확인했을 뿐 실제 타당성 근거가 아니다.

운영 허용 canonical은 0개이며 발행은 차단 상태다.

## 다음 차단 게이트

1. `SCENARIO_DIRECT_VALIDATION` — protocol_ready_real_execution_not_started
2. `INDEPENDENT_SEVEN_ROLE_REVIEW` — external_execution_not_started
3. `COGNITIVE_INTERVIEWS` — protocol_ready_participants_zero
4. `R_RUNTIME_AND_RECOVERY_STUDY` — runner_ready_runtime_missing
5. `EMPIRICAL_STRUCTURE_RELIABILITY_DIF` — data_collection_not_started
6. `CUSTOMER_PUBLICATION_APPROVAL` — zero_entries_approved

재현 명령:

```bash
npm run research:trait-map:v2:v2-3-current:check
```
