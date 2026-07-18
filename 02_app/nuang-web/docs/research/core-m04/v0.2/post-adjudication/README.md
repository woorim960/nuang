# M04 v0.2 판정 후 재검토 자료

상태: `M05_FIVE_ITEM_MOBILE_PARTICIPANT_PREVIEW_READY_NOT_RUN`

## 생성 완료

- `SMRL-C11-r3` 제한 M04 Stage 1 blind packet: 8개
- Stage 1 전체 잠금 뒤 공개할 Stage 2 target reveal: 8개
- M04 opaque mapping·reviewer roster·packet lock log
- M05 수정 문항 자연 응답 form: 5문항
- M05 참가자 안전 JSON과 개발 전용 모바일 실행 화면
- M05 문항별 이해·회상·판단·바람직성·접근성 probe
- M05 session log·issue codebook·item decision template
- 전체 산출물 SHA-256 manifest

M04 Stage 1 파일과 M05 자연 응답 form에는 target facet과 keyed direction을 노출하지 않는다. M05 participant-facing form은 `CIT-001`~`CIT-005` opaque ID만 사용한다.

## SMRL-C11-r3 Stage 1 진행

- 내부 AI 전문 역할: 6개
- 독립 blind 응답: 6 files · 6 rows
- metadata·허용값·원문 불변·hash: `PASS`
- 응답 파일: 읽기 전용 잠금
- Stage 2 공개: `NO`
- 기록: [internal-critique/v0.1](./internal-critique/v0.1)

## SMRL-C11-r3 Stage 2 진행

- Stage 1 전체 잠금·hash 재검증 뒤 역할별 공개
- 동일 내부 AI 전문 역할의 독립 응답: 6 files · 6 rows
- metadata·허용값·공개 선후관계·hash: `PASS`
- 응답 파일: 읽기 전용 잠금
- 결과 집계·판정: `PASS_TO_COGNITIVE`
- 의미: 운영 승인 아님·M05 사용자 이해 검토 이동 가능

## 증거 경계

내부 AI 역할 검토와 M05 자료 준비까지만 수행했으며 외부 전문가 검토나 사용자 인터뷰는 아직 수행하지 않았다. 현재 문항을 검증된 문항, 운영 가능 문항 또는 실제 사용자 근거로 표현하지 않는다. 앱·DB·검사 seed·채점·코드 발급도 변경하지 않았다.

## 재현·검사

```bash
node scripts/generate-core-m04-v02-post-adjudication-kits.mjs --check
node scripts/check-core-m04-v02-post-adjudication-kits.mjs
npm test -- src/features/research/m05
```

개발 전용 모바일 확인 주소:

```text
http://localhost:3000/assessments/nu-core-full?preview=m05-cognitive
```

이 화면은 메모리에서만 첫 응답·현재 응답·변경 여부를 처리한다. 운영 검사 IndexedDB, 채점, 코드 발급, 결과 저장에는 연결하지 않는다.

## 다음 게이트

1. 자연 응답 완료 뒤 진행자가 문항별 공통·전용 probe를 확인하고 기록하는 내부 화면을 연결한다.
2. 동의·철회·기록 범위를 확정한 뒤 외부 참여자에게 자연 응답→문항별 probe 순서로 검토하되, SMRL 필수 5개 위험 확인 결과가 모두 기록되기 전 문항을 통과시키지 않는다.
