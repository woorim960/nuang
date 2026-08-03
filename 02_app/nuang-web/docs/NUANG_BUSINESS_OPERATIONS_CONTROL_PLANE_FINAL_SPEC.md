# NUANG 광고·메일 비즈니스 운영 제어 플랫폼 최종 기획서

작성일: 2026-08-03  
상태: V1.1 구현 기준  
적용 범위: 운영센터 광고·제휴, 광고 문의 메일, 마케팅 이메일, 동의·수신거부, Resend Webhook

## 1. 목표

운영자가 일상적인 광고·메일 업무를 수행할 때 SQL, Vercel 환경변수 화면, Resend 원시 로그를 기본 도구로 사용하지 않아도 되게 한다. 운영센터만으로 다음 질문에 즉시 답하고 조치할 수 있어야 한다.

1. 지금 실제 송출이 열려 있는가.
2. 누구에게 어떤 근거로 발송되는가.
3. 운영자가 테스트하고 승인한 정확한 내용이 발송되는가.
4. 예약·발송·전달·지연·반송·신고·수신거부가 어디까지 진행됐는가.
5. 장애나 오발송 위험이 생기면 즉시 멈출 수 있는가.
6. 실패한 작업 중 무엇을 안전하게 재처리할 수 있는가.
7. 누가 언제 무엇을 바꿨는가.
8. 광고 문의, 캠페인, 소재와 광고 슬롯은 정책 Gate를 통과했는가.

고객 화면에는 내부 장애, 법률검토 절차, 운영 기술 용어를 노출하지 않는다. 고객에게 필요한 선택권과 수신거부만 쉽고 분명하게 제공한다.

## 2. 감사 방법

세 전문 관점으로 현재 구현을 독립 감사한 뒤 코드와 DB에서 교차 검증했다.

- 제품 운영 기획: 캠페인·문의·승인·복구·감사·Runbook
- 관리자 UX: 정보 구조, 상태 가시성, 실수 방지, 반응형, 접근성
- SRE·보안: queue claim, idempotency, 경합, Webhook, suppression, cron, 개인정보

점검 파일:

- `src/features/admin/AdminMarketingConsole.tsx`
- `src/features/admin/AdminAdvertisingConsole.tsx`
- `src/features/admin/server-admin-marketing.ts`
- `src/features/admin/server-admin-advertising.ts`
- `src/features/marketing/server-marketing-email-outbox.ts`
- `src/features/advertising/server-advertising-mail-outbox.ts`
- `src/app/api/internal/advertising/email-webhook/route.ts`
- `supabase/migrations/202608030003_marketing_email_release1.sql`
- 광고 문의·광고 송출 Release 1 migration

## 3. 감사 결론

기존 구현은 구조화 콘텐츠, 발신 표기, 원클릭 수신거부, 이메일 암호화, claim, 최대 재시도, Resend idempotency, 오전 8시~오후 9시 Gate, 광고 kill switch 등 기반이 좋다. 그러나 대량 운영을 열기 전에 다음 P0가 필요했다.

### 3.1 P0 결함

1. 사용자의 수신거부 suppression이 이후 hard bounce·complaint 사유 승격을 막아 재동의 때 위험 suppression까지 해제될 수 있었다.
2. 저장하지 않은 편집기 내용으로 테스트할 수 있고, 테스트한 내용과 승인한 DB 내용의 동일성이 보장되지 않았다.
3. 발송 환경 Gate가 잠겨 있어도 캠페인을 queue할 수 있어, 나중에 환경만 열면 과거 대기열이 자동 발송될 수 있었다.
4. readiness가 암호화 키, Webhook secret, cron secret을 검사하지 않아 준비 완료가 실제와 다를 수 있었다.
5. pause·cancel 뒤 이미 claim된 메일을 외부 API 호출 직전에 다시 막는 권한 검사가 없었다.
6. `email.failed`, `email.suppressed`, `email.delivery_delayed`가 운영 상태에 반영되지 않았다.
7. 캠페인별 recipient를 브라우저 서버에서 직접 세어 1,000건 이후 수치가 잘릴 수 있었다.
8. failed, retry, stale sending, cron, Worker, Webhook 미매칭과 2년 동의 확인을 운영센터에서 볼 수 없었다.
9. 모든 캠페인 행이 하나의 예약 시각 state를 공유했다.
10. 광고 소재 실물·목적지·표시문구를 한 화면에서 확인하지 않고도 승인할 수 있었다.
11. 광고 캠페인 상태를 자유롭게 선택해 정책 검수 단계를 우회할 수 있었다.
12. 광고 문의 목록 조회가 상세 열기 전에도 불필요한 암호문과 payload를 서버 메모리로 읽었다.
13. 광고 문의 메일 Worker의 마지막 성공·실패와 완료 기록 실패를 운영센터에서 확인하거나, 공급자 미접수 실패만 안전하게 재처리할 수 없었다.

## 4. 운영 원칙

### 4.1 이중 발송 Gate

실제 발송은 다음 두 Gate가 모두 열려야 한다.

- 배포 Gate: `MARKETING_EMAIL_SEND_ENABLED=true`와 필수 환경설정
- DB Gate: 운영센터의 `marketing_channel_control.emergency_paused=false`

환경변수 활성화만으로 과거 대기열이 자동 발송되지 않는다. 대상 확정과 재개 API도 readiness를 통과해야 한다.

### 4.2 콘텐츠 버전 불변성

캠페인 본문은 구조화 필드의 fingerprint로 식별한다.

```text
초안 저장
  → 저장된 DB 버전으로 운영자 테스트
  → 테스트 provider message ID·fingerprint 기록
  → 현재 fingerprint와 테스트 fingerprint 일치
  → 승인 가능
```

제목·본문·CTA를 한 글자라도 수정하면 테스트와 승인은 자동 무효화된다.

### 4.3 발송 직전 재승인

claim은 외부 발송 승인이 아니다. Resend 호출 직전에 다음을 다시 검사한다.

- 캠페인이 queued/sending인지
- 캠페인 control version이 claim 당시와 같은지
- DB 긴급 중지가 아닌지
- 최신 동의 cycle이 대상 확정 당시와 같은지
- 이메일 인증과 계정 상태가 유효한지
- 수신거부·반송·신고 suppression이 없는지

pause·cancel은 campaign control version을 바꿔 기존 claim을 무효화한다.

### 4.4 Suppression 위험도

활성 suppression은 다음 우선순위를 강제한다.

```text
spam complaint > hard bounce/provider suppression > member unsubscribe
```

사용자 재동의는 `member_unsubscribed`만 해제한다. 공급자 위험 suppression은 재동의만으로 해제하지 않는다.

### 4.5 개인정보 최소화

- 캠페인 대상은 account ID로만 고정한다.
- 원문 이메일은 발송 직전에 서버에서만 복호화한다.
- 테스트·Worker·Webhook 운영 테이블에 원문 이메일을 저장하지 않는다.
- 광고 문의 목록은 마스킹 값과 업무 필드만 읽는다.
- 광고 문의 원문은 별도 확인과 감사기록 뒤에만 복호화한다.

## 5. 마케팅 이메일 운영센터 정보 구조

경로: `/admin/marketing`

### 5.1 전역 상태

- 배포 Gate 준비 상태
- DB 긴급 중지 상태와 마지막 사유
- 발송 가능 대상 집계 성공/실패
- 데이터 기준 시각
- 진단 실행
- 긴급 중지·재개

조회 실패는 절대 `0명`으로 표시하지 않는다.

- 정상 0: `현재 발송 가능한 회원이 없습니다`
- 조회 실패: `연결 확인`
- DB 운영 제어 없음: 전체 기능 fail-closed

### 5.2 운영 Health

- Worker·Cron 마지막 상태와 마지막 완료 시각
- queued/sending/retry/failed/stale 건수
- Webhook 마지막 수신과 24시간 미매칭
- 2년 동의 확인 예정·대기·전달·실패
- 사용자 철회와 공급자 위험 suppression
- 최근 전달 이벤트와 운영 감사기록

Worker 완료 기록 실패도 정상 성공으로 계산하지 않는다.

### 5.3 캠페인 작성

필드:

- 운영용 이름
- 이메일 제목
- 상단 짧은 문구
- 본문 제목
- 일반 텍스트 본문
- CTA 문구와 nuang.app HTTPS 주소

작업 순서:

1. 실제 서버 렌더 확인
2. 초안 저장
3. 저장된 버전으로 운영자 테스트
4. Webhook 전달 상태 확인
5. 승인
6. 대상과 KST 예약 시각 확인
7. queue

미저장 변경이 있으면 브라우저 이탈 경고를 제공한다.

### 5.4 실제 렌더 미리보기

운영센터가 별도 HTML을 흉내 내지 않는다. 서버의 실제 renderer 결과를 sandbox iframe으로 표시한다.

- 모바일/데스크톱 폭
- `(광고)` 제목
- 실제 footer
- 문의 이메일·연락처
- 수신거부 placeholder
- text version

### 5.5 캠페인 운영

캠페인별 표시:

- 상태, 제목, 최근 변경
- 현재 콘텐츠 테스트 여부와 시각
- 대상, queued, retry, sent, delivered
- failed, suppressed, skipped, unsubscribed
- 가장 오래된 대기 시각

허용 행동만 표시한다.

```text
draft → test → approved → queued → sending → completed
                           ↘ paused ↔ queued
failed → 미발송 실패만 audited retry
```

예약 state는 campaign ID별로 완전히 분리한다.

### 5.6 안전 재시도

재시도 조건:

- 상태가 failed
- provider message ID가 없음
- 운영 사유 5자 이상
- 환경 Gate와 DB Gate 정상
- 최신 동의·인증·suppression 재검사

공급자 접수 여부가 불확실한 행은 자동 재전송하지 않는다.

## 6. Resend Webhook 운영 계약

수집 이벤트:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.failed`
- `email.bounced`
- `email.complained`
- `email.suppressed`

원칙:

- Svix 서명과 허용 시간 검증
- `svix-id` unique로 at-least-once 중복 제거
- Webhook 원문·수신자 이메일 미보존
- 과거 이벤트가 complaint를 bounce로 낮추지 않음
- unmatched 이벤트도 운영 메타데이터로 기록
- 테스트 메일도 provider message ID로 캠페인과 연결

## 7. Worker·Cron 운영 계약

각 실행은 PII 없는 run record를 남긴다.

- source: cron/manual
- running/succeeded/degraded/failed/locked
- campaign claim 수
- 2년 확인 claim 수
- sent/failed/completion failed
- 시작·완료 시각
- 정제된 error code

운영 경고 기준:

- 마지막 정상 완료 5분 초과
- stale sending 1건 이상
- completion failed 1건 이상
- failed 증가
- Webhook 미매칭 증가

메일 API 요청은 10초 timeout을 적용한다. 캠페인과 2년 확인 queue는 한쪽 claim 실패가 다른 쪽 성공 claim을 방치하지 않도록 독립 처리한다.

## 8. 2년 수신동의 확인

운영센터에서 다음을 본다.

- 30일 이내 예정
- queued/retry
- sent/delivered
- failed
- bounce/complaint suppression

메일에는 전송자 뉴앙, 동의 사실, 최근 동의일, 유지·철회 방법과 로그인 없는 수신거부를 포함한다.

## 9. 광고·제휴 운영센터

경로: `/admin/advertising`

### 9.1 항상 보이는 송출 안전 바

전역 kill switch를 여섯 번째 설정 탭에만 두지 않는다. 화면 최상단에서 다음을 표시한다.

- 전체 광고 송출 정상/중지
- 최근 사유
- 사유 입력
- 즉시 중지/재활성화

### 9.2 문의 큐

목록은 원문 암호문을 읽지 않고 다음만 제공한다.

- 접수번호, 회사, 문의 유형
- 상태, 우선순위, 담당
- 첫 응답 SLA, 다음 조치
- 확인 메일 상태
- 마스킹 이메일

현재 Release에서 최근 표시 제한이 있으면 `전체 N건 중 최근 M건`이라고 명시한다. 제한 범위의 수치를 전체 수치처럼 표현하지 않는다.

문의 확인 메일은 별도의 PII 없는 Worker 실행 이력을 남긴다. 운영센터는 pending/sending/retry/dead/stale, 마지막 실행 상태, 완료 기록 실패를 표시한다. 운영자는 `dead`이면서 provider message ID가 없는 건만 5자 이상의 사유를 남겨 재시도할 수 있다. 반송·신고 또는 공급자 접수 이력이 있는 메일은 자동 재전송하지 않는다.

### 9.3 광고 캠페인 상태

DB가 인접 전이만 허용한다.

```text
draft → policy_review → approved → scheduled → active
                         ↑            ↓          ↓
                         └─ paused ←──┘        ended
paused → policy_review | ended
```

차단 조건:

- direct provider 실제 송출 잠금
- policy version/approval 없음
- 쿠팡 승인 소재 없음
- 전역·공급자·슬롯 kill switch
- 소재 만료

### 9.4 소재 실물 검수

승인 화면에서 확인한다.

- 실제 이미지
- 전체 목적지 URL과 새 창 확인
- 광고·제휴 표시 문구
- 대체 텍스트
- 설명
- 사실 확인일
- 만료일

쿠팡 소재는 이미지, 목적지, 대체 텍스트, `일정액의 수수료` 대가성 문구, 사실 확인을 모두 충족하기 전 승인 버튼을 잠근다. DB도 같은 핵심 Gate를 강제한다.

### 9.5 데이터 범위

목록 조회는 명시적 최신순과 exact count를 사용한다. 현재 UI에 표시 제한이 있으면 범위를 노출한다. 향후 1,000건 이상 운영 시 cursor pagination과 DB 집계 RPC를 적용한다.

## 10. 운영 Runbook

모든 Runbook은 감지 조건, 첫 5분 조치, 영향 확인, 중지, 복구, 종료 조건, 증적을 따른다.

### R01 오발송 위험

1. 마케팅 상단 `긴급 중지`
2. 영향 캠페인 pause/cancel
3. sent와 delivered를 분리 확인
4. 이미 Resend 접수된 메일 범위 기록
5. 운영 기록에 원인과 종료 시각 남김

### R02 Worker 5분 이상 중단

1. 환경 Gate와 DB Gate 확인
2. stale/retry/failed 확인
3. 사유 입력 후 `진단 실행`
4. completion failed이면 재전송하지 않고 공급자 상태 확인
5. 정상 Worker 완료 기록 뒤 종료

### R03 Resend 장애

1. 긴급 중지
2. 새 queue 금지
3. provider message ID 없는 retry만 유지
4. Resend 복구 뒤 작은 진단 실행
5. delivered Webhook 확인 뒤 재개

### R04 Webhook 미매칭

1. Webhook secret과 운영 endpoint 확인
2. Resend에서 failed event replay
3. svix-id 중복과 provider message ID 확인
4. 미매칭 0 또는 원인 격리 뒤 종료

### R05 반송·신고 급증

1. 긴급 중지
2. 공급자 위험 suppression 증가 확인
3. 영향 캠페인 취소
4. 대상 출처와 이메일 인증 정책 확인
5. complaint suppression은 수동 해제 금지

### R06 일부 실패 재처리

1. failed 중 provider message ID 없음 확인
2. 실패 원인과 설정 복구
3. 5자 이상 사유 입력
4. `실패 건 재시도`
5. sent/delivered와 중복 0 확인

### R07 수신거부 문의

1. 동의 관리에서 현재 상태 확인
2. 고객에게 이메일 하단 수신거부 또는 프로필 설정 안내
3. 운영자가 고객 동의를 대신 켜지 않음
4. member unsubscribe와 provider suppression을 구분

### R08 2년 확인 실패

1. confirmation failed 수 확인
2. 환경·Webhook 복구
3. provider ID가 없는 안전한 실패만 재처리
4. 다음 cycle 생성이 unique row로 막히지 않는지 확인

### R09 광고 전체 긴급 중지

1. 광고 화면 상단 전역 중지
2. provider/slot별 영향 확인
3. 악성 소재 캠페인 pause/ended
4. 앱 광고 미노출 확인
5. 정책 재검토 뒤에만 재활성화

### R10 광고 문의 메일 실패

1. 문의 메일 환경 준비 상태 확인
2. 설정 오류 중에는 attempt를 소진하지 않음
3. dead/retry와 문의 SLA를 함께 확인
4. 운영자에게 직접 연락이 필요한 문의 우선 처리

## 11. 데이터 보존

이번 Release에서 자동화한 PII 없는 운영 메타데이터:

- Worker run: 90일
- Webhook receipt: 90일
- 테스트 발송 증적: 1년

아래는 실제 계약·세무·고객문의 정책 확정이 필요한 후속 Gate다. 임의로 삭제하지 않는다.

- 광고 문의 원문과 연락처
- 광고 문의 outbox 암호문
- 계약 문의 증적
- 공급자 실적 import 원본

정책 확정 뒤 dry-run, legal hold, 처리 건수, 실패 건수와 감사기록을 갖춘 별도 retention Release로 구현한다.

## 12. 실제 데이터가 부족한 항목

다음 값은 현재 원천 데이터가 없어 임의로 채우지 않는다.

1. AdSense 실제 수익
2. 쿠팡 파트너스 실제 수익·주문
3. provider 공식 fill/impression 기준과 앱 raw event의 조정값
4. 계약 금액과 정산 상태

필요 구축 방법:

- AdSense 공식 리포트/API 또는 CSV import
- 쿠팡 파트너스 공식 리포트/API 또는 CSV import
- import file hash, 기간, 통화, 행 수, 오류 기록
- 동일 기간 중복 감지와 diff
- 예상과 실제 수익의 완전 분리

원천 데이터가 연결되기 전 성과 화면은 `미연동`을 유지한다.

## 13. 구현 파일

- `supabase/migrations/202608030004_business_operations_control_plane.sql`
- `src/features/admin/AdminMarketingConsole.tsx`
- `src/features/admin/AdminMarketingConsole.module.css`
- `src/features/admin/server-admin-marketing.ts`
- `src/app/api/admin/marketing/campaigns/route.ts`
- `src/app/api/admin/marketing/operations/route.ts`
- `src/app/api/admin/marketing/preview/route.ts`
- `src/features/marketing/server-marketing-email-outbox.ts`
- `src/app/api/internal/advertising/email-webhook/route.ts`
- `src/features/advertising/server-advertising-mail-outbox.ts`
- `src/features/admin/AdminAdvertisingConsole.tsx`
- `src/features/admin/server-admin-advertising.ts`

## 14. 활성화 Gate

대량 발송 전 반드시 순서대로 통과한다.

1. `202608030004` 적용
2. 운영센터 DB 제어, test delivery, Worker, Webhook 객체 확인
3. `MARKETING_EMAIL_SEND_ENABLED=false` 상태에서 운영자 본인 테스트
4. 테스트 메일의 `(광고)`, From, Reply-To, footer, 모바일 렌더 확인
5. delivered Webhook이 캠페인 test delivery와 연결되는지 확인
6. preview 수신거부는 데이터 변경이 없는지 확인
7. 실제 계정 1개의 최신 동의·인증 이메일 canary 준비
8. DB 긴급 중지 상태에서 발송 0건 확인
9. 환경 Gate 활성화
10. 1명 canary 발송·전달·수신거부 확인
11. small batch 뒤 bounce/complaint/중복 0 확인

Gate 하나라도 실패하면 환경 발송 잠금을 유지한다.

## 15. 완료 기준

- 조회 실패를 0명으로 표시하는 경우 0건
- 저장된 현재 버전을 테스트하지 않고 승인 0건
- 환경 Gate 잠금 중 queue/resume 0건
- pause/cancel 뒤 무효 claim 발송 0건
- complaint/hard bounce suppression이 재동의로 해제되는 경우 0건
- 1,000명 이상 캠페인 상태 집계 누락 0건
- failed/retry/stale/Worker/Webhook/2년 확인 운영센터 가시화
- provider message ID 없는 실패만 재시도
- 모든 위험 작업 감사기록
- 광고 소재 실물 검수 전 승인 0건
- 광고 캠페인 상태 검수 우회 0건
- 광고 문의 목록의 불필요한 암호문 조회 0건
- 모바일 주요 조작 44px 이상
- 타입검사, lint, 단위 테스트, production build 통과

## 16. 후속 Release

운영 규모가 커질 때 다음 순서로 확장한다.

1. 역할별 권한과 위험 작업 최근 재인증
2. 2인 승인과 대규모 audience threshold
3. 광고 문의 서버 검색·필터·cursor pagination·CRM 타임라인
4. 광고 문의 내부 메모·연락 기록과 서버 검색
5. 공급자 실적 import와 idempotent 일일 집계
6. 계약·세무 기준 보존/비식별화 자동화
7. 암호화 key ID·keyring·rotation
8. 다국가·다국어·법역별 발송 Gate
9. SMS·앱 푸시의 별도 동의·수신거부 플랫폼
