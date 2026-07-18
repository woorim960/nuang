# NUANG M04 전문가 검토 응답 수신·잠금 사양

작성일: 2026-07-18 KST  
문서 상태: `M04_INTAKE_CONTRACT_V0_1`  
측정 상태: `NO_VALIDITY_CLAIM_WITHOUT_INDEPENDENT_RESPONSES`  
프로토콜: `m04-core-expert-kit.v0.1`

관련 문서:

- [전 코어 M04 실행 키트](./NUANG_M04_FULL_CORE_EXPERT_REVIEW_EXECUTION_KIT.md)
- [내부 운영 runbook](./research/core-m04/internal/01_COORDINATOR_RUNBOOK.md)
- [사전등록 템플릿](./research/core-m04/internal/02_PREREGISTRATION_TEMPLATE.md)
- [판정 가이드](./research/core-m04/internal/03_ADJUDICATION_GUIDE.md)

## 0. 목적

검토자가 CSV에 응답한 뒤 다음 오류를 자동 차단한다.

- 문항·상황 라벨·opaque ID·순서의 사후 변경
- 허용되지 않은 mapping·평정·위험 코드
- 응답 누락과 CSV 열 손상
- W1·W2·W3 Stage 1 잠금 전 Stage 2 공개
- 잠금 뒤 응답 파일 변경
- 다른 protocol·slot·wave 응답 혼합

이 검사는 연구 운영 무결성을 확인한다. 문항의 타당도나 사용자 이해를 자동으로 증명하지 않는다.

## 1. 사전 점검

```bash
npm run research:core:review-intake:preflight
```

다음을 모두 확인한다.

- Stage 1·2 각각 24개 packet, packet당 50행
- Stage 1·2의 공통 문항 ID·상황·질문·순서 일치
- 모든 응답 열이 최초 생성 시 비어 있음
- roster 8개 slot과 lock log 24행
- packet SHA-256과 실제 생성 파일 일치
- 응답 원본 SHA-256을 별도로 기록할 열 존재

## 2. 실제 수신 폴더 계약

연락처·이름·보상 정보는 아래 연구 응답 폴더에 넣지 않는다.

```text
intake-root/
├── reviewer_roster.csv
├── packet_lock_log.csv
├── stage1/
│   ├── R01_W1_stage1_response.csv
│   └── ...
└── stage2/
    ├── R01_W1_stage2_response.csv
    └── ...
```

- `reviewer_roster.csv`: 생성된 `reviewer_roster_template.csv`를 복사해 사용한다.
- `packet_lock_log.csv`: 생성된 `packet_lock_log.csv`를 복사해 사용한다.
- 응답 파일은 해당 packet을 복사한 뒤 응답 열만 채운다.
- 파일명·열 이름·행 순서·식별 열·target 열은 변경하지 않는다.
- 시각은 timezone이 포함된 ISO 8601을 사용한다. 예: `2026-07-18T14:20:00+09:00`.

## 3. 응답 hash와 잠금

Stage 1 응답을 받으면:

1. 형식 검사를 통과시킨다.
2. 수신 원본의 SHA-256을 `stage1_response_sha256`에 기록한다.
3. 원본 write access를 제거한다.
4. `stage1_lock_verified_at`을 기록한다.
5. 같은 slot의 세 회차가 모두 잠기면 세 행에 동일한 `all_stage1_waves_locked_at`을 기록한다.

반복 작업은 관리 명령으로 수행할 수 있다.

```bash
npm run research:core:review-intake:manage -- \
  --action lock-stage1 \
  --intake-root /absolute/path/to/intake-root \
  --reviewer-slot R01 \
  --locked-by coordinator-id
```

Stage 2는 위 절차 뒤에만 공개한다. 응답을 받으면 `stage2_response_sha256`과 `stage2_locked_at`을 같은 방식으로 기록한다.

`release-stage2`는 세 Stage 1 응답 hash가 잠금 기록과 일치할 때만 target reveal template을 응답 폴더로 복사한다. 기존 Stage 2 응답 파일은 덮어쓰지 않는다.

hash가 잠금 기록과 다르면 원본을 수정해 맞추지 않는다. 사고·수정 여부를 deviation log에 남기고 포함 여부를 판정한다.

## 4. 실제 응답 검사

```bash
node scripts/check-core-expert-review-intake.mjs \
  --intake-root /absolute/path/to/intake-root
```

검사는 부분 수신도 허용한다. 다만 Stage 2 파일이 하나라도 있으면 같은 검토자의 세 Stage 1 응답, 세 회차 전체 잠금 시각, Stage 2 공개 시각과 응답 hash가 모두 있어야 한다.

## 5. 판정 전 하드 게이트

- [ ] 사전등록이 첫 응답 열람 전에 잠겼다.
- [ ] 유효 검토자 포함·제외와 deviation이 먼저 결정됐다.
- [ ] 최소 역할 구성과 독립성이 충족됐다.
- [ ] 모든 포함 응답의 hash가 잠금 기록과 일치한다.
- [ ] Stage 2 조기 공개가 없다.
- [ ] 원문 응답·소수 의견·위험 근거가 보존됐다.
- [ ] 내부 AI 검토는 `INTERNAL_CRITIQUE`로 분리됐다.

하나라도 충족되지 않으면 자동 집계 결과가 있더라도 M04를 완료하거나 운영 문항·DB로 이관하지 않는다.

## 6. 자동 집계

유효한 검토자 6명 이상이 Stage 1·2를 모두 완료하고 roster 상태가 `COMPLETE`가 되면 새 versioned 폴더에 집계한다.

```bash
npm run research:core:review-analysis -- \
  --intake-root /absolute/path/to/intake-root \
  --output-root /absolute/path/to/new-analysis-v1
```

생성물:

- `analysis_summary.json`: 포함 검토자 수, 자동 판정 제안 분포, seam·치명 위험 수
- `item_metrics.csv`: target mapping·방향 일치율과 모든 평정 중앙값
- `mapping_confusion_matrix.csv`: target facet별 첫 mapping 혼동표
- `qualitative_evidence.csv`: 검토자별 위험·메모·최종 근거 원문
- `reviewer_inclusion.csv`: roster 상태와 실제 분석 포함 여부

자동 판정은 사전 기준에 따른 triage 제안이다. `PASS_TO_COGNITIVE`, `COPY_REVISE`, `CONSTRUCT_REWRITE`, `HOLD_FOR_ACCESS`, `HOLD_FOR_RISK_REVIEW`, `EXCLUDE_OR_REBUILD` 중 하나를 제안하지만 `final_decision`을 쓰지 않는다. 최종 판정은 소수 위험과 원문 근거를 확인한 adjudication에서만 기록한다.

6명 미만의 결과는 `--allow-incomplete-preview`로 내부 파이프라인 점검만 할 수 있다. 이 출력은 `INCOMPLETE_INTERNAL_PREVIEW_NOT_FOR_ADJUDICATION`으로 표시되고 문항 판단에 사용할 수 없다.

## 7. 앱 개발 경계

M04 응답 수신과 판정 중에도 현재 localhost UI 셸 검토는 이어갈 수 있다. 다만 아래는 M06~M09 승인 전 금지한다.

- 후보 문항을 운영 seed로 승격
- provisional 50점 분할 채점을 새 코드 채점으로 표현
- `E/I · R/N · G/A · K/M · C/Q`를 검증된 대표 코드로 발급
- 새 문항·점수 필드를 운영 DB에 publish
- provisional 결과를 공유·피드·비교에 전파
