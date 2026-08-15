# 뉴앙 무료 운영 모니터링 가이드

기준일: 2026-08-15

## 목적

운영 기능이나 사용자 데이터에 영향을 주지 않고 다음 상태를 조기에 확인한다.

- 주요 공개 화면과 피드 API의 상태 코드·응답 시간
- 비로그인 요청이 계정 전용 API에서 계속 안전하게 차단되는지
- Supabase DB 크기, 현재 프로젝트 Storage 객체 크기와 연결 사용률
- R2 관리 바이트, 숨김 업로드와 미디어 정리 적체
- 활성 NUANG 크론의 최근 실패·장기 실행·마지막 성공
- 광고·마케팅 메일 큐의 due·stale·terminal failure
- 예약된 공식 콘텐츠의 게시·마감 지연
- 결과 삭제 tombstone 수

## 실행

```bash
npm run monitor:production
npm run monitor:production -- --json
npm run monitor:production -- --http-only
npm run monitor:production:email
```

`DATABASE_URL` 또는 `NUANG_DATABASE_URL`은 로컬 환경 파일에서만 읽고 출력하지 않는다. DB 연결은 Supabase가 공식 배포한 CA를 고정해 서버 인증서를 검증하며, 교체가 필요하면 `NUANG_DATABASE_CA_FILE`로 새 인증서 경로를 지정한다. DB 점검은 `BEGIN READ ONLY`, 5초 statement timeout, `ROLLBACK`을 강제한다. 내부 outbox drain URL과 쓰기 RPC는 호출하지 않는다.

`monitor:production:email`은 동일 점검을 실행하고 최종 결과를 `NUANG_MONITOR_EMAIL_TO`로 보낸다. 실패 또는 실행 오류는 10초 뒤 한 번 재확인하며, 메일은 최종 상태 한 통만 발송한다. 발송 네트워크 오류나 Resend 429·5xx는 같은 idempotency key로 한 번만 재시도해 중복을 방지한다. 자동화에서는 `npm run monitor:production:email -- --scheduled`를 사용하며 자동화 예약 시각인 매시 52분을 기준으로 회차를 계산한다. 실행 시작 시각의 분이 52보다 작으면 이전 시간의 `:52`, 52 이상이면 현재 시간의 `:52` 회차에 속한다. `pass`만 같은 회차·수신자의 프로세스 간 중복을 기존 발송으로 처리한다. `recovered`·`warn`·`fail`은 알림 유실 방지를 우선해 고정된 실행 시작 시각을 nonce로 사용하고 표시 분류, 정렬된 비정상 issue의 `status:id`, 수신자를 key에 함께 반영하므로 프로세스 간 중복 억제를 하지 않는다. Resend의 `invalid_idempotent_request`도 v3 `pass` 중복 scope에서만 발송 성공으로 처리하며 알림 scope, 다른 409, 해석할 수 없는 오류 응답은 실패-폐쇄한다. `concurrent_idempotent_requests`는 같은 본문과 key로 한 번만 재시도한 뒤 실패-폐쇄한다. 공급자 응답 본문이나 message는 출력하지 않는다. 수신자·발신자·답장 주소는 각각 `NUANG_MONITOR_EMAIL_TO`, `NUANG_MONITOR_EMAIL_FROM`, `NUANG_MONITOR_EMAIL_REPLY_TO`로 변경할 수 있고, 발신자는 인증된 `nuang.app` 하위 도메인만 허용한다. HTML과 plain text에는 집계된 운영 지표만 포함하며 환경변수, credential, 응답 본문, 사용자 정보는 넣지 않는다.

HTTP 응답이 임계값만 넘긴 `warn`이면 10초를 한 번만 기다린 뒤 해당 경로만 순차 재확인한다. 재확인에서 정상으로 돌아오면 일시적인 콜드 연결로 기록하고 정상 처리하며, 두 번 연속 느린 경로만 주의로 남긴다. 상태 코드·본문·보안 헤더 실패는 처음부터 `fail`이며 이 지연 확인으로 완화하지 않는다.

## 판정 기준

| 항목               | 경고                         | 실패                                               |
| ------------------ | ---------------------------- | -------------------------------------------------- |
| HTTP 전체 응답     | 1.5초 이상                   | 5초 이상, timeout, 예상하지 않은 상태·본문         |
| DB 크기            | 350MB 이상                   | 425MB 이상                                         |
| Supabase Storage   | 현재 프로젝트 700MB 이상     | 현재 프로젝트 850MB 이상                           |
| DB 연결            | `max_connections`의 50% 이상 | 75% 이상                                           |
| 매분 크론          | 최근 실패 후 복구됨          | 마지막 성공 5분 초과, 마지막 실행 실패·stuck       |
| 일일 크론          | 최근 실패 후 복구됨          | 마지막 성공 36시간 초과, 마지막 실행 실패·stuck    |
| 최근 크론 실행시간 | 1초 이상                     | 5초 이상                                           |
| 메일 큐            | due 행 존재                  | 5분 이상 due, stale sending, 최근 terminal failure |
| 공식 콘텐츠        | 게시·마감 due 행 존재        | 5분 이상 게시·마감 지연                            |

Supabase 무료 플랜은 DB가 500MB를 넘으면 read-only 상태가 될 수 있으므로 70%와 85%에서 미리 경고한다. Storage는 `storage.objects`의 현재 프로젝트 객체 크기를 합산해 공식 1GB 조직 한도보다 이른 700MB·850MB에 경고한다. 다른 프로젝트까지 합친 조직 전체 Storage와 egress·MAU는 이 SQL로 알 수 없으므로 시작 시점, 24시간, 48시간에 Supabase Usage 화면에서 함께 확인한다.

마케팅 큐의 due 시간은 KST 08:00~21:00 발송 창 밖이거나 긴급 중지 중이면 판정에서 제외한다. 이미 15분 넘게 `sending`인 행과 최근 terminal failure는 중지 상태와 관계없이 실패로 판정한다.

Vercel Hobby 런타임 로그는 1시간만 보관된다. 이 모니터는 사용자 요청 전체의 5xx 비율을 대신하지 않고, 주요 경로의 합성 장애를 감지한다. 실제 5xx 조사 시 Vercel 프로젝트의 Logs 화면에서 최근 1시간을 확인한다.

## 48시간 관찰 부하

시간당 한 번 실행하면 한 회당 HTTP GET 10회와 읽기 전용 DB 세션 1개만 사용한다. 48시간 합계는 HTTP 480회와 DB 세션 48개이며, 점검 결과 자체를 DB에 기록하지 않는다. 모니터 메일에는 `production_monitor` 태그를 붙이고 공통 Resend webhook이 이 태그를 DB 접근 전에 정상 응답으로 제외하므로 광고·마케팅 운영 기록도 만들지 않는다.

시간당 운영 메일 한 통은 하루 24통, 48시간 동안 48통이다. Resend 무료 거래성 한도인 하루 100통·월 3,000통 안이지만 인증메일과 다른 운영 메일도 같은 한도를 함께 사용하므로 Resend Usage를 함께 확인한다.

전체 `smoke:server:readiness`는 배포 직후 또는 이상 탐지 후에만 사용한다. 임시 계정·게시물·투표·댓글을 생성하는 `smoke:community:authenticated`는 자동 반복하지 않는다.

## 대응 순서

1. HTTP 실패가 2회 연속이면 Vercel 배포 상태와 최근 Logs를 확인한다.
2. 크론 실패가 있으면 해당 `cron.job_run_details`의 오류와 마지막 성공을 확인한다.
3. due queue가 5분 넘게 남으면 outbox worker 설정과 Vault origin/secret을 확인한다.
4. DB가 350MB를 넘으면 증가량과 큰 테이블을 확인하고 보존 정책을 검토한다.
5. 현재 프로젝트 Storage가 700MB를 넘으면 R2 제한 전환 또는 Supabase Pro 전환을 결정하고, 850MB 전에는 실행한다.
6. 기능 확인이 필요해도 먼저 읽기 전용 readiness를 실행하고, 쓰기 smoke는 배포 직후 한 번만 수행한다.

## 공식 무료 한도 근거

- Supabase 요금 및 무료 한도: https://supabase.com/pricing
- Supabase DB 크기와 read-only 동작: https://supabase.com/docs/guides/platform/database-size
- Vercel Hobby 한도: https://vercel.com/docs/plans/hobby
- Vercel Runtime Logs 보관: https://vercel.com/docs/logs/runtime
- Resend 무료 발송 한도: https://resend.com/docs/knowledge-base/what-is-resend-pricing

DB CA는 Supabase Database Settings의 `Download certificate`가 제공하는 `Supabase Root 2021 CA`를 사용한다. SHA-256 fingerprint는 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`, 만료일은 2031-04-26이다. 교체 시 새 인증서의 발급처·fingerprint·실제 pooler 연결을 검증한 뒤 갱신한다.
