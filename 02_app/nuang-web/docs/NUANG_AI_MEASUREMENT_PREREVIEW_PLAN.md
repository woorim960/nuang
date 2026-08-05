# NUANG AI 측정 사전검토 상세 기획

작성일: 2026-08-05 KST
문서 상태: `DESIGN_COMPLETE_EXECUTION_NOT_STARTED`
프로토콜: `NUANG-AI-MEASUREMENT-PREREVIEW-1.0`
대상: 코어 문항·채점·5글자 코드·결과 문구
효력: `INTERNAL_RISK_DISCOVERY_ONLY · NO_HUMAN_GATE_EFFECT`

## 0. 한 줄 결론

AI 사전검토는 인간 연구와 같은 체크리스트·증거 파일·판정 인계 형식을 미리
실행해 결함을 찾는 내부 QA다. 결과가 깨끗해도 상태는 `사람 검토 준비`이며,
`통과`, `승인`, `validated`, `active`를 만들 수 없다.

## 1. 현재 구현 전수 조사 결과

| 영역 | 현재 계약 | 확인한 경계 또는 문제 |
| --- | --- | --- |
| 코드 스킴 | `NUANG-CODE-5AXIS-CANDIDATE-1.0`, 상태 `candidate` | 인지·공정성/불변성·정량·신뢰도/구조 네 gate 모두 `not_started` |
| DB 출시 게이트 | candidate → validated → active 분리, 활성화 RPC 존재 | 실제 사람/정량 근거 없이는 활성화하면 안 됨 |
| 관리자 연구 | M04 독립 전문가, M05 인지 인터뷰, M06 파일럿, M07~09 분석 안내 | 자동 지표와 사람 검토의 경계는 있으나 AI 사전검토 전용 상태가 없었음 |
| 기존 AI 검토 | M04 blind packet을 여섯 AI 역할로 dry-run, 원본·hash·분석 보존 | 내용타당도 절차 시험에 한정. 네 출시 gate 전체의 공통 계약은 아님 |
| 검사 런타임 | 공개 코어 URL이 candidate quick/full fallback을 제공 | 측정 계획의 `운영 배포 금지`·`연구 중인 예비 신호` 원칙과 충돌하는 출시 차단 이슈 |
| 결과 리포트 | 확률·능력·순위 오독 방지 문구가 있음 | candidate/검증 중 상태가 사용자에게 충분히 보이지 않았고 일부 `승인` 표현이 심리측정 승인으로 오해될 수 있었음 |
| 공유·피드·비교 | 제품 기능과 공개 projection이 구현됨 | 측정 게이트 문서는 active 전 provisional 전파를 금지함. release 상태 기반 서버 차단을 출시 전에 통합해야 함 |
| 테스트 | 측정 활성화 DB gate, 결과 확률 오독, 연구 격리 테스트가 존재 | AI 상태가 사람 gate를 바꾸지 못한다는 계약 테스트와 candidate 고지 회귀 테스트가 없었음 |

### 출시 전 별도 해결이 필요한 최상위 이슈

1. 공개 검사 fallback이 candidate release를 고객 검사처럼 실행한다.
2. candidate 결과가 계정 저장 뒤 공유·피드·공개 프로필·비교로 전파될 수 있다.
3. DB activation gate와 웹 runtime publication gate가 하나의 서버 정책으로 묶여
   있지 않다.
4. 현재 AI 내부 검토 결과를 사람 M04 완료나 네 측정 gate 완료로 승격하면 안
   된다.

이 문서의 AI 사전검토는 1~3을 정당화하지 않는다. 오히려 해당 경로를 사람
검증 전까지 차단해야 한다는 증거를 제공한다.

## 2. 목적과 하지 않는 일

목적:

- 사람 검토 전에 문항·코드북·연구 설계·분석 코드의 명백한 결함을 줄인다.
- 인간 연구자가 받을 packet과 같은 열·ID·근거 구조로 결과를 남긴다.
- 위험 의견 하나가 평균에 묻히지 않게 원문과 소수 의견을 보존한다.
- 사람 검토자가 AI의 결론이 아니라 재현 가능한 문제 가설부터 확인하게 한다.
- 모델·프롬프트·입력·출력·코드 버전을 hash로 추적한다.

하지 않는 일:

- AI를 독립 심리측정 전문가, 실제 2030 참여자, 표본 응답자로 세지 않는다.
- AI 응답으로 내용타당도 지수, 인지 이해율, DIF, 측정불변성, omega, 재검사
  신뢰도, EFA/CFA 적합도를 확정하지 않는다.
- 합성 응답을 실제 정량 파일럿 데이터와 합치지 않는다.
- AI 결과로 `validationGates.* = passed`, 스킴 `validated`, release `active`를
  쓰지 않는다.
- 운영 seed·채점·DB·고객 문구를 자동 수정하거나 게시하지 않는다.
- 다수 AI가 동의했다는 이유로 치명 위험이나 소수 의견을 폐기하지 않는다.

## 3. 사람 승인과 섞이지 않는 상태 모델

### 3.1 트랙별 상태

| 상태 | 의미 | 사람 gate 효과 |
| --- | --- | --- |
| `not_started` | 잠긴 실행 입력 없음 | 없음 |
| `inputs_locked` | 입력·프로토콜·프롬프트·모델 정책 hash 고정 | 없음 |
| `running` | 독립 역할 실행 또는 자동 감사 중 | 없음 |
| `completed_with_blockers` | 산출물 완성, 사람 확인 전 차단 이슈 존재 | 없음 |
| `completed_no_blockers` | 사전등록 기준의 새 차단 이슈 없음 | 없음 |
| `superseded` | 입력 또는 프로토콜 변경으로 이전 실행 폐기 | 없음 |

금지 상태 이름:

- `passed`
- `approved`
- `validated`
- `active`
- `human_review_complete`

### 3.2 전체 상태

| 전체 상태 | 계산 규칙 | 관리자 표시 |
| --- | --- | --- |
| `not_started` | 네 트랙 모두 시작 전 | 사전검토 전 |
| `running` | 하나 이상 시작했고 blocker 완료 없음 | 사전검토 중 |
| `blocked` | 하나라도 `completed_with_blockers` | 차단 항목 확인 필요 |
| `human_handoff_ready` | 네 트랙 모두 `completed_no_blockers` | 사람 검토 준비 |

`human_handoff_ready`는 가장 높은 AI 상태다. 이 상태에서도 네 사람
`validationGates` 값은 그대로 유지한다.

### 3.3 저장 분리

AI 상태와 사람 상태를 같은 열이나 enum에 저장하지 않는다.

```text
measurement_release.validation_gates       # 사람/실제 데이터 승인만
research_ai_prereview_run.status            # AI 사전검토 실행 상태
research_ai_prereview_issue.disposition     # 사람의 후속 확인 상태
```

AI 테이블에 `approved_by`, `validation_passed_at` 같은 열을 만들지 않는다.
대신 `reviewed_by_human_at`, `human_disposition`은 AI 이슈를 사람이 읽었는지만
기록하며 측정 gate 승인과 분리한다.

## 4. 모든 트랙의 공통 실행 규약

### 4.1 입력 잠금

실행 전 아래를 하나의 manifest로 잠근다.

- 코드 스킴 버전과 구성개념 정의 버전
- item bank·scoring·result copy release ID
- 문항 ID·revision·상황·질문·방향·facet 매핑
- 사람 검토 체크리스트 버전
- AI 역할 정의와 blind/reveal 순서
- system/developer/task prompt 원문 또는 보안상 안전한 hash
- 모델 공급자·모델 ID·snapshot/version·temperature 등 실행 설정
- 생성기·분석 스크립트 git commit과 파일 hash
- 금지 주장·위험 코드북·판정 기준

입력이 하나라도 바뀌면 기존 실행을 덮어쓰지 않고 `superseded`로 닫은 뒤 새
run을 만든다.

### 4.2 역할 분리

최소 역할은 다음과 같다. 역할은 서로의 응답을 보지 않고 실행한다.

1. blind construct mapper
2. Korean comprehension critic
3. accessibility and exposure critic
4. fairness and stigma critic
5. quantitative design auditor
6. psychometric analysis-code auditor
7. result-claim traceability critic
8. adversarial minority-risk reviewer

같은 기반 모델을 여러 역할로 호출한 결과는 여덟 명의 독립 인간으로 세지
않는다. 결과에는 `shared_model_family=true`를 남긴다.

### 4.3 두 단계 실행

1. Stage 1은 target facet·key 방향·작성 의도를 숨긴다.
2. 각 역할의 원본 출력과 hash를 잠근다.
3. 모든 Stage 1이 잠긴 뒤에만 Stage 2 target/reveal packet을 제공한다.
4. Stage 2가 Stage 1 원문을 수정하지 못하게 별도 파일로 저장한다.
5. 집계기는 제안 상태만 만들고 최종 사람 결정을 쓰지 않는다.

### 4.4 공통 이슈 원장

모든 이슈는 아래 열을 사용한다.

| 열 | 규칙 |
| --- | --- |
| `issue_id` | run 안에서 불변인 opaque ID |
| `track_id` | 네 트랙 중 하나 |
| `source_run_id` | 모델 실행 식별자 |
| `artifact_ref` | 문항·스크립트·문구·분석 계획 ID |
| `severity` | `blocker`, `major`, `minor`, `note` |
| `risk_code` | 사전등록된 코드북 값 |
| `evidence_excerpt` | 짧은 직접 근거. 결론만 기록 금지 |
| `counterevidence` | 반론·대안 해석 |
| `recommended_action` | 유지·수정·재작성·사람 확인·제외 후보 |
| `confidence` | low/medium/high. 타당도 확률로 표현 금지 |
| `human_disposition` | `unreviewed`, `accepted`, `rejected`, `needs_evidence` |
| `human_note` | 사람 판단 근거 |

blocker 하나는 다른 역할의 다수결로 자동 해제하지 않는다. 사람 책임자가 원문과
반론을 확인해 disposition을 남겨야 한다.

## 5. 트랙 A — 인지·내용 사전검토

사람 대응 단계: M04 독립 전문가 검토 + M05 인지 인터뷰 준비.

### AI 체크리스트

- blind 첫 번째·두 번째 구성개념 매핑
- HIGH/LOW/구분 어려움 방향 추정
- 한 번 읽고 이해되는지
- 하나의 관찰 가능한 반응만 묻는지
- 최근 6개월 빈도 척도로 답할 수 있는지
- 문항을 일상어로 다시 말했을 때 의도가 유지되는지
- 떠올릴 장면이 특정 직업·관계·자원에 묶이는지
- 능력·도덕성·임상 상태를 간접 추론하는지
- 인접 facet·방법 효과·사회적 바람직성 seam
- 결과 문구가 문항보다 더 넓은 주장을 하는지
- 수정 후에도 item identity를 재사용하면 안 되는 정도인지

### 산출물

- `blind_role_responses.csv`: 사람 Stage 1 열과 같은 mapping·방향·명확성 필드
- `item_metrics.csv`: 일치 분포·불명확·seam 제안. 타당도 통과율로 명명 금지
- `qualitative_evidence.csv`: 역할별 원문 근거와 반론
- `issue_ledger.csv`: blocker를 포함한 통합 위험 원장
- `human_handoff.md`: M04/M05에서 사람이 먼저 확인할 문항·probe 질문

### AI로 답할 수 없는 질문

- 실제 2030 사용자가 어떤 경험을 떠올리는가
- 모바일에서 긴 문항을 어떻게 읽고 응답을 바꾸는가
- “판단하기 어려워요”를 실제로 선택하는 이유가 무엇인가
- 수정 문구가 실제 사용자 오해를 해소했는가

완료 조건은 사람 M04/M05용 packet의 결함이 줄고 probe 우선순위가 정리되는
것이다. 문항 내용타당도 통과가 아니다.

## 6. 트랙 B — 공정성·측정불변성 사전검토

사람 대응 단계: M04 편향·접근성 검토, M05 표집, M06 하위집단 계획, M07 DIF와
측정불변성.

### AI 체크리스트

- 문화·성별·직업·학생 여부·관계 상태 노출 위험
- 장애·보조기기·기기·문해·한국어 숙련 접근 위험
- 특정 생활 자원이나 디지털 서비스 경험을 전제하는지
- C/Q, K/M, G/A가 무능·무책임·비정상·비도덕으로 읽히는지
- 임상·위기 선별을 일상 성향 문항에 섞는지
- subgroup별 예상 응답 과정 차이 가설
- 표집 quota와 최소 셀 크기 산출 입력
- ordinal/continuous 선택을 포함한 DIF 분석 계획
- configural·metric·scalar/threshold invariance 단계
- 불변성 실패 때 전체 평균을 그대로 비교하지 않는 fallback
- 소수 위험 의견 보존과 재인터뷰 계획

### 산출물

- `risk_hypothesis_register.csv`
- `subgroup_coverage_matrix.csv`
- `dif_invariance_analysis_plan.md`
- `minority_risk_ledger.csv`
- `human_handoff.md`

AI는 위험을 놓칠 수 있고 반대로 존재하지 않는 고정관념을 만들어낼 수 있다.
따라서 출력은 `위험 가설`이며, 실제 참여자·접근성 전문가·집단별 데이터로
확인하기 전 `공정함`, `편향 없음`, `불변성 통과`라고 쓰지 않는다.

## 7. 트랙 C — 정량 파일럿 사전점검

사람 대응 단계: M06 사전등록·모집·데이터 품질·독립 확인 표본.

### AI 체크리스트

- 목표 모집단과 제외 모집단의 명시
- 문항 수·요인 수·분석 모형·탈락률에 연결된 표본 수 입력
- 개발 표본과 확인 표본의 사전 분리
- 재검사 표본과 간격
- 불성실·초고속·직선 응답·결측·판단 어려움 처리
- 제외 기준을 결과를 본 뒤 바꾸지 않는 잠금
- 외부 척도 사용 권리와 한국어판 근거
- 식별정보 분리·최소 수집·철회·삭제
- 모바일 이탈·오프라인/재시도·중복 제출 복구
- 합성 edge-case 데이터로 분석 파이프라인 dry-run
- 빈 셀·단일 응답·역문항·극단 분포·결측에서 fail closed

### 산출물

- `preregistered_analysis_plan.md`
- `sample_size_inputs.json`
- `synthetic_pipeline_report.json`
- `data_quality_rulebook.csv`
- `human_handoff.md`

합성 데이터는 코드가 실행되고 예상 실패를 감지하는지만 확인한다. 실제
효과크기, 표본 대표성, 완료율, 응답 분포, 문항 성능을 만들어내지 않는다.

## 8. 트랙 D — 신뢰도·구조·결과 주장 사전점검

사람 대응 단계: M07 신뢰도·요인구조, M08 채점, M09 score-to-copy 검토.

### AI 체크리스트

- 응답 분포·천장/바닥·판단 어려움 진단 계획
- 수정 문항-총점 상관과 교차 적재 기준
- EFA 모형 비교와 독립 표본 CFA 분리
- 5축·facet 위계 구조의 경쟁 모형
- ordinal 문항에 맞는 추정법·상관행렬 선택
- alpha 하나가 아닌 omega·불확실성·재검사
- 수렴·변별 근거와 인접 구성개념 비교
- 경계 구간·대안 코드·minimum evidence 시뮬레이션
- quick/full 일치와 권위 차이
- 작은 응답 변화에 대한 코드 안정성
- 모든 결과 문장의 domain·facet·점수 범위·금지 추론 연결
- 분석 실패나 독립 표본 비재현 때 구조를 수정하는 규칙

### 산출물

- `analysis_notebook_lock.json`
- `model_comparison_template.csv`
- `reliability_template.csv`
- `score_copy_traceability.csv`
- `human_handoff.md`

실제 독립 표본이 없으면 표와 코드는 빈 템플릿 또는 합성 dry-run 상태로 남긴다.
AI가 숫자를 생성해 빈 칸을 채우지 않는다.

## 9. 표준 폴더와 manifest

```text
docs/research/ai-prereview/<protocol>/<run-id>/
├── packet_manifest.json
├── inputs/
│   ├── locked_release_manifest.json
│   └── role_protocols/
├── raw/
│   └── <track>/<role>-response.json
├── analysis/
│   ├── issue_ledger.csv
│   └── <track>/...
├── handoff/
│   └── <track>-human-handoff.md
└── RUN_BOUNDARY.md
```

`packet_manifest.json` 필수 필드:

- `protocolVersion`, `runId`, `createdAt`
- `codeSchemeVersion`, `itemReleaseId`, `scoringReleaseId`, `copyVersion`
- `inputFiles[{path, sha256}]`
- `roleRuns[{roleId, provider, modelId, modelVersion, settings, outputSha256}]`
- `promptHashes[{roleId, stage, sha256}]`
- `analysisCode[{path, sha256}]`
- `trackStatuses`
- `humanGateEffect: "none"`
- `containsSyntheticData`
- `containsPersonalData` — 기본 `false`
- `supersedesRunId`

원문 prompt에 비밀이나 개인정보가 있다면 prompt 원문 대신 보안 저장소 위치와
hash만 manifest에 남긴다. 실제 참여자 응답은 AI 사전검토 입력으로 사용하지
않는 것이 기본이다.

## 10. 관리자 UI 규칙

출시 검증 화면은 두 영역을 시각적으로 분리한다.

1. `사람·실제 데이터 검증 gate`: 대기/통과/실패와 승인 책임자를 표시한다.
2. `AI 사전검토`: 사전검토 전/중/사람 검토 준비/차단 항목 확인 필요만
   표시한다.

AI 영역에서 금지:

- 초록색 `통과`, check badge, `승인 완료`
- 사람 reviewer 수에 AI role 수 합산
- “AI 전문가 8명”, “검증 완료”, “타당성 인증”
- AI 상태 변경 시 `validation_gates` update

권장 문구:

> AI 사전검토 · 인간 검토나 승인이 아닙니다. 체크리스트와 분석 절차를 미리
> 실행해 사람 검토에서 확인할 위험을 정리합니다.

## 11. 출시 게이트 연결

AI 사전검토 완료 후에도 다음 순서를 유지한다.

```text
AI human_handoff_ready
→ 독립 사람 M04
→ 실제 사용자 M05
→ 실제 정량 M06
→ 독립 표본 M07
→ 채점·경계 M08
→ 결과 주장 M09
→ 개인정보·법률·운영 QA
→ validated 후보
→ 별도 배포 승인
→ active release
```

서버 정책의 최종 형태:

- 검사 runtime은 `active` release만 일반 고객에게 제공한다.
- 연구 URL은 별도 동의·권한·noindex·고정 release ID를 요구한다.
- 결과 저장은 release 상태와 연구/고객 목적을 함께 저장한다.
- `candidate`, `beta`, `legacy`, `research_only` 결과는 공유·피드·공개 프로필·
  비교 API에서 서버가 거절한다.
- 클라이언트 버튼 숨김만으로 publication gate를 구현하지 않는다.
- active → retired 롤백 시 새 공유 생성을 막고 기존 링크 정책을 명시한다.

## 12. 테스트 계획

### 계약 테스트

- 네 AI 트랙이 네 사람 gate와 1:1로 대응한다.
- AI status enum에 `passed|approved|validated|active`가 없다.
- 모든 트랙에 12개 이상의 점검 필드, manifest, 사람 인계서, 제한 문구가 있다.
- 모든 트랙이 깨끗하게 끝나도 summary는 `human_handoff_ready`이고 사람 gate
  효과는 `none`이다.
- blocker 하나가 있으면 전체 상태가 `blocked`다.

### 산출물 무결성 테스트

- manifest와 실제 입력·출력 hash 일치
- Stage 1 잠금 전 Stage 2 생성 금지
- 모델·프롬프트·분석 코드 provenance 누락 시 완료 상태 금지
- raw 출력 수정 시 hash 실패
- 합성 데이터가 실제 pilot 폴더에 섞이면 실패
- run 간 protocol/release 혼합 시 실패

### UI·문구 테스트

- 관리자 화면에 `AI 사전검토 · 인간 검토나 승인이 아닙니다` 노출
- AI 영역에 통과·승인 badge 없음
- candidate 결과 안내에 검증 중 후보·자기이해 참고·확정 판정 아님 표시
- 결과 점수를 확률·순위·능력·진단으로 표현하지 않음
- 공개 승인이라는 말이 측정 승인으로 오해되지 않게 게시 상태로 표현

### 출시 차단 통합 테스트

- candidate result로 share-link 생성 실패
- candidate result를 profile_public으로 변경 실패
- candidate result attachment로 feed 작성 실패
- candidate snapshot으로 comparison 생성 실패
- active release만 위 네 경로 허용
- 연구 참여 철회·삭제 뒤 분석 export와 재사용 차단

## 13. 구현 순서

1. 상태·트랙·산출물 계약과 단위 테스트 — 완료.
2. 관리자 출시 검증 화면에 사람 gate와 별도 AI 경계 문구 — 완료.
3. 결과 리포트 candidate 고지와 오해 가능한 승인 표현 정리 — 완료.
4. manifest·role packet·raw output validator 스크립트 구현.
5. 기존 M04 AI blind critique를 새 protocol run으로 이관하되 원본 hash 보존.
6. 공정성·정량 설계·신뢰도/구조 세 트랙의 첫 dry-run 수행.
7. 사람 연구자에게 handoff packet 검토를 요청하고 disposition 기록.
8. runtime/share/feed/profile/compare의 active-release 서버 gate 구현.
9. M04~M09 실제 연구 완료 뒤에만 measurement gate 변경.

## 14. 허용 표현과 금지 표현

허용:

- “AI 사전검토에서 확인할 위험 가설 12개를 찾았다.”
- “분석 계획과 파이프라인을 합성 데이터로 dry-run했다.”
- “사람 검토용 packet이 준비됐다.”
- “사람 연구와 실제 정량 검증은 아직 시작 전이다.”

금지:

- “AI 전문가가 문항을 검증했다.”
- “AI 인지 인터뷰를 통과했다.”
- “합성 파일럿에서 신뢰도가 입증됐다.”
- “측정불변성이 확보됐다.”
- “AI 검토 완료로 출시 gate가 통과됐다.”
- “검증된 뉴앙 코드”, “정확한 성향 확정”

## 15. 완료 정의

AI 사전검토 체계 완료:

- 네 트랙의 입력·출력·원문·hash·이슈·인계서가 재현 가능하다.
- AI 상태와 사람 gate가 스키마·API·UI·문구에서 분리된다.
- blocker와 소수 의견이 사람 disposition 전까지 열린 상태로 남는다.
- AI 완료가 운영 release·고객 공유를 활성화할 수 없다는 테스트가 통과한다.

측정 출시 완료는 별개다. 실제 독립 전문가, 실제 사용자, 실제 정량 표본,
독립 확인 분석, 결과 문구 검토, 법률·개인정보·운영 승인이 모두 끝나야 한다.
