# NUANG Expert Agent Team Operating Model

작성일: 2026-07-18 KST  
상태: `EXPERT_AGENT_SQUAD_V2_ACTIVE`  
적용 범위: 성향검사, 제품기획, UI/UX, 사용자 문구, 개발, 데이터, 테스트, 접근성, 개인정보, 출시 품질

## 0. 운영 결정

뉴앙은 앞으로 한 에이전트가 기획부터 검수까지 혼자 결론 내리는 방식으로 진행하지 않는다.

```text
전문 분야별 독립 검토
→ 다른 전문 에이전트의 반론
→ 근거와 고객 위험 비교
→ 통합 책임 에이전트의 설계안
→ Product Owner 승인
→ 실제 구현
→ 독립 QA 에이전트의 회귀 검증
```

전문 에이전트가 많다는 사실보다 아래 네 가지를 지키는 것이 중요하다.

1. 초안 작성자와 최종 검수 관점을 분리한다.
2. 다른 에이전트의 결론을 보기 전에 먼저 독립 검토한다.
3. 의견을 취향이 아니라 `주장·근거·고객 위험·대안·검증 방법`으로 기록한다.
4. 모든 화면을 정상·로딩·오류·복구·접근성 상태까지 구현하고 검증한다.

## 1. 전문 에이전트 로스터

| 전문 에이전트                    | 핵심 책임                                               | 주요 산출물                           |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| Chief Product Orchestrator       | 전체 맥락, 작업 분해, 전문가 배치, 충돌 조정, 최종 통합 | 작업 계획, 통합 명세, 결정 기록       |
| Product Strategy Lead            | 고객 가치, MVP 범위, 사용자 흐름, 성공 지표             | flow brief, 우선순위, 제외 범위       |
| UX Research Lead                 | 첫 이해, 부담·이탈, 과업 성공, 사용자 가설              | 검증 시나리오, 혼동·이탈 위험         |
| Product / UI Design Lead         | 정보 위계, 앱 surface, 반응형, 디자인 시스템            | 화면 구조, 상태표, 반응형 명세        |
| Interaction / Motion Lead        | 상태를 설명하는 동작, 캐릭터, reduced motion            | motion map, 시작·종료 조건            |
| Korean UX Writing Lead           | 쉬운 생활 언어, CTA·오류·신뢰 문구                      | copy deck, 고객 용어 사전             |
| Korean Grammar / Speaking Lead   | 문법, 조사·호응, 말하기, TTS, 의미 단위 줄바꿈          | 문장 감사, 소리 내 읽기 결과          |
| Psychometrics Lead               | 구성개념, 문항, 척도, scoring, 신뢰도·타당도·공정성     | 구성개념 지도, 문항 추적표, 측정 위험 |
| Personality Psychology Lead      | 5축·facet 의미, 상태/특성, 리포트 해석                  | 축 경계, 인접 개념, 해석 가드레일     |
| Quantitative Methods Lead        | 파일럿 설계, 분석계획, 구조·오차·DIF                    | 분석 명세, 재현 코드, 결과 감사       |
| Principal Engineering Lead       | 프론트·서버·DB 경계, 공통 구조, rollback                | 구현 계약, ADR, migration 계획        |
| Frontend / UX Engineering Lead   | Next.js UI, 상태, IndexedDB, safe area, focus           | component·state 구현                  |
| Backend / Data Lead              | API, Supabase, RLS, idempotency, versioning             | DB·API 계약, rollback                 |
| QA / Release Lead                | 위험 기반 테스트, 결함 등급, GO/NO-GO                   | test evidence, release checklist      |
| Accessibility / Performance Lead | WCAG, 실제 기기, 확대, motion, Web Vitals               | 접근성·성능 감사                      |
| Privacy / Safety Lead            | 최소 수집, 저장·삭제·공유, 로그·분석 제한               | privacy impact note, 노출 등급        |
| Customer Delight Lead            | 신뢰를 해치지 않는 재미, 호기심, 재방문 동기            | delight 제안과 부작용 검토            |

각 전문 좌석은 작업 위험에 따라 별도 에이전트로 호출한다. 동시에 처리할 수 있는 에이전트 수가 제한되면 아래처럼 여러 검토 파동으로 나누되, 서로 다른 전문 관점을 한 결론으로 미리 합치지 않는다.

## 2. 실제 협업 파동

### Wave A — 의미와 고객 가치

병렬 검토:

1. Product Strategy + UX Research
2. Psychometrics + Personality Psychology
3. Korean UX Writing + Grammar / Speaking

검토 질문:

- 이 기능이 고객에게 왜 필요한가?
- 성향검사의 의미나 결과 주장을 왜곡하지 않는가?
- 처음 보는 사람도 한 번에 이해하고 자기 말로 설명할 수 있는가?

### Wave B — 경험과 구현 가능성

병렬 검토:

1. Product / UI Design + Motion + Delight
2. Principal Engineering + Frontend + Backend / Data
3. QA + Accessibility + Privacy / Safety + Performance

검토 질문:

- 실제 모바일 앱으로 아름답고 자연스럽게 동작하는가?
- 정상뿐 아니라 오류·복구·재진입을 구현할 수 있는가?
- 데이터 손실·접근성 실패·개인정보 노출·성능 저하가 없는가?

### Wave C — 반론과 통합

- Wave A 결과를 Wave B가 공격적으로 검토한다.
- Wave B 설계를 Wave A가 고객 의미와 측정 신뢰 관점에서 다시 검토한다.
- 각 blocker에는 최소 하나의 해결 대안을 붙인다.
- Chief Product Orchestrator가 합의점과 충돌점을 분리한다.
- 해결되지 않은 측정·데이터·안전 blocker는 평균내지 않고 중단 상태로 남긴다.

## 3. 전문 에이전트 공통 작업 패킷

모든 에이전트는 같은 입력 패킷을 받는다.

```text
1. 현재 사용자 요청과 승인된 결정
2. 화면 진입 맥락과 다음 경로
3. 관련 요구사항·측정·UI 기준 문서
4. 현재 구현 코드와 실제 모바일 화면
5. 정상·로딩·오류·복구 상태
6. 변경 가능한 범위와 변경 금지 범위
7. 검토 질문과 원하는 산출물
```

에이전트는 아래 형식으로 답한다.

```text
결론
근거
발견한 고객 위험
blocker / improvement 등급
권장 대안
반대 대안이 더 나을 수 있는 조건
검증 방법
남은 불확실성
```

## 4. 화면 하나씩 진행하는 승인 게이트

### G0 — 목적 승인

- 화면 목적 한 문장
- 진입·생략·이탈 조건
- 사용자의 핵심 행동 하나
- 다음·이전 목적지

### G1 — 의미·문구 승인

- 측정 영향과 priming 위험
- 고객에게 보여도 되는 주장 범위
- 제목·설명·CTA·오류 문구
- 개인정보 공개·저장 설명
- 320px 의미 단위 줄바꿈과 TTS

### G2 — 디자인 승인

- 320·360·390·430·520px
- 정보 위계, 여백, 엄지 동선, safe area
- 긴 문구와 200% 확대
- motion 목적과 reduced-motion 대체
- 캐릭터·아이콘·자산 품질

### G3 — 동작 승인

- 정상·loading·offline·error·recovery·resume
- 뒤로가기, 중복 탭, 재진입
- API·DB·로컬 저장·idempotency
- 실제로 조작 가능한 프로토타입

### G4 — 구현 승인

- 공통 component와 versioned data contract
- unit·component·API/DB·critical E2E
- 모바일 visual·접근성·성능 검증
- build와 rollback

각 게이트는 아래 상태만 사용한다.

```text
AGENT_REVIEWED
→ OWNER_DIRECTION_APPROVED
→ IMPLEMENTATION_READY
→ IMPLEMENTED
→ QA_VERIFIED
```

`AGENT_REVIEWED`를 인간 전문가 인증이나 실제 표본 검증 완료로 표현하지 않는다.

## 5. 역할별 독립 승인권

충돌 우선순위:

```text
법·안전·개인정보
→ 검사 의미·공정성
→ 데이터 무결성·접근성
→ 고객 핵심 과업 성공
→ 안정성·성능
→ 재미와 브랜드
→ 일정·전환율
→ 시각 장식
```

- Psychometrics: 문항, 응답 척도, scoring, 경계, 결과 해석, priming
- Privacy / Safety: 데이터 노출, 보관, 삭제, 공유, 분석 이벤트
- Accessibility: 핵심 과업 수행 불가
- QA / Release: 합의된 blocking test 실패
- Principal Engineering: 데이터 손실, rollback 불가, 운영 불가능한 구조
- Product Strategy: 위 가드레일 안에서 제품 범위와 우선순위
- Product / UI Design: 위 가드레일 안에서 시각·interaction
- Korean UX Writing: 승인된 의미 안에서 고객 문구 체계

## 6. 성향검사 에이전트 프로토콜

```text
측정 목적
→ 구성개념 정의
→ 문항 추적
→ 응답 척도·판단 어려움
→ scoring·경계·혼합형
→ 리포트 주장
→ UI priming
→ 데이터 versioning
→ 테스트 벡터
```

필수 검토:

- `축 → facet → 처음 드는 생각 / 실제 나타나는 반응 → 상황 → 채점 방향` 추적
- 중복·이중질문·유도·가치판단·사회적 바람직성
- 상황 라벨과 질문의 중복
- 역채점, 무응답, 판단 어려움, 경계형 처리
- 대표 코드와 상세 코드의 재현 가능한 산출
- 혼합형·낮은 확신이 실패나 열등함처럼 보이지 않는 해석
- 관계·능력·정신건강·미래를 단정하지 않는 리포트
- 문항·scoring·copy release version 일치

Stop-ship:

- 문항·점수·코드·리포트의 추적이 끊김
- 프론트와 서버가 다른 코드를 만듦
- UI나 캐릭터가 특정 응답 방향을 암시함
- 낮은 확신을 확정 성향처럼 표시함
- 능력·도덕·진단·궁합·관계 성공을 근거 없이 예측함
- release ID가 없어 과거 결과를 재현할 수 없음
- 실제 응답 없이 `검증 완료`, `정확도`, `전문가 인증`을 주장함

에이전트는 연구 검토, 문항 감사, 분석 코드, scoring 검증을 매우 정교하게 수행할 수 있다. 다만 실제 응답 데이터 없이 모집단의 타당도·신뢰도·공정성을 학술적으로 인증할 수는 없으므로 확보된 증거 범위만 표현한다.

## 7. Korean UX 문구 프로토콜

처음 본 사용자는 아래를 자기 말로 설명할 수 있어야 한다.

1. 지금 어디에 있는가?
2. 무엇을 해야 하는가?
3. 하면 무엇을 얻게 되는가?
4. 무엇이 저장·공개되는가?
5. 나가거나 실패하면 어떻게 되는가?

문구 감사:

1. 내부 용어 제거
2. 대명사의 대상 명확화
3. 한 문장 한 기능
4. 실제 2030 생활 언어
5. 소리 내 읽기
6. 320px 의미 단위 줄바꿈
7. `정확·공식·대표·곧·안전`의 근거 확인

초안 작성 에이전트와 Korean UX Writing 검수 에이전트를 분리하고, Grammar / Speaking 에이전트가 다시 읽는다.

## 8. 디자인·재미 프로토콜

- 게임성은 진행·발견·성취에 사용하고 특정 답을 고르게 만드는 보상에 사용하지 않는다.
- 문항 화면에서는 이해와 신뢰가 우선이고, 결과·홈·피드·비교에서 재미를 강화한다.
- 색·캐릭터·모션은 답의 좋고 나쁨을 암시하지 않는다.
- 장식은 상태·선택·브랜드 의미 중 하나를 설명하지 못하면 제거한다.
- 핵심 동작은 한 손 사용, 충분한 터치 영역, 색상 외 구분, reduced motion을 지원한다.

## 9. 개발·QA 프로토콜

### 정적·순수 로직

- typecheck, lint, format, diff, content schema
- scoring, progress, milestone, reusable answer, idempotency

### component·state integration

- quick/full, fresh/reuse/resume
- 1~5와 판단 어려움
- 저장 성공·실패·재시도
- checkpoint 계속·홈 재개
- 마지막 연속 탭, focus, reduced motion

### API·DB

- migration, RLS, ownership, unique, rollback
- 직접 응답·점수·판단 어려움 이유가 report·share·feed로 새지 않는지 검증

### critical E2E

- 온보딩→첫 검사→결과
- 결과→정밀 소개→답 재사용
- 판단 어려움→이탈→재개
- 절반 checkpoint 1회
- 저장 실패→복구
- 완료 중복 방지
- 공유 공개 범위

### visual·accessibility·performance

- 320·390·430·520px
- 200% 확대, 키보드, safe area, 화면 읽기 순서
- LCP·INP·CLS와 asset budget

## 10. 작업별 에이전트 배치 규칙

| 작업 종류        | 반드시 참여할 에이전트                                             |
| ---------------- | ------------------------------------------------------------------ |
| 문항·응답척도    | Psychometrics, Personality, Korean UX, QA                          |
| 결과·코드·리포트 | Psychometrics, Personality, Product, Copy, Privacy, Design         |
| 검사 runner      | Product, Psychometrics, Design, Engineering, QA, Accessibility     |
| 홈·피드·게임성   | Product, Design, Delight, Copy, Privacy, QA                        |
| 공유·비교·프로필 | Product, Psychometrics, Privacy, Backend/Data, Copy, QA            |
| DB·API·동기화    | Principal Engineering, Backend/Data, Privacy, QA                   |
| 캐릭터·모션      | Design, Motion, Delight, Psychometrics, Accessibility, Performance |

## 11. 다음 화면부터 적용

다음 작업인 `S03-R.COMPLETE 검사 완료·결과 준비 전환 상태`부터 아래 순서로 실제 가동한다. 최신 화면 계약에서 `S04-R`은 첫 성향 결과, `S05-R`은 정밀 성향 검사 소개이므로 `S05-R`을 완료 전환에 재사용하지 않는다.

1. Product·Psychometrics·Korean UX 에이전트 독립 검토
2. Design·Engineering·QA 에이전트 독립 검토
3. 서로의 blocker와 대안 교환
4. 통합 화면 메시지와 상태 계약 제시
5. Product Owner 검토·승인
6. 이미지·UI 제작
7. 실제 코드 구현
8. 독립 QA와 모바일 검증

이 운영 방식은 이후 모든 화면과 데이터 변경에 반복 적용한다.

## 12. 기준선

- AERA·APA·NCME, Standards for Educational and Psychological Testing
- International Test Commission, Technology-Based Assessment·Quality Control
- ISO 9241-210 / NIST Human-Centered Design
- W3C WCAG 2.2
- 국립국어원 쉬운 공공언어 원칙
- 개인정보보호위원회 Privacy by Design

이 기준은 전문 에이전트의 검토 체크리스트로 사용하며, 에이전트가 공식 기관을 대신해 인증했다고 표현하지 않는다.
