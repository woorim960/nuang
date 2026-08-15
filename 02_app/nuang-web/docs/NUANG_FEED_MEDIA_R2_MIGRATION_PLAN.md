# 뉴앙 피드 미디어 R2 점진 이관 설계

## 결정

뉴앙의 PostgreSQL, Supabase Auth, RLS, RPC, 크론은 Supabase에 유지한다. 피드 사진만 Cloudflare R2로 점진 전환한다. 프로필 사진은 용량이 작고 계정 기능과 결합되어 있으므로 이번 전환 범위에서 제외한다.

R2는 속도만을 이유로 선택하지 않는다. 현재 Supabase 원본과 Vercel 함수가 모두 서울에 있어 최초 요청은 이미 짧다. R2의 목적은 무료 저장공간 확대, 전송 비용 제거, 반복 이미지 조회의 캐시 제어다. 체감 성능은 공급자 교체보다 업로드 이미지 재인코딩과 immutable 객체 키에서 먼저 확보한다.

## 현재 기준선

- `feed-media`는 비공개 Supabase Storage 버킷이다.
- 운영 `feed-media` 객체는 아직 0개이므로 기존 사용자 파일을 옮길 필요가 없다.
- 게시물당 사진은 최대 19장이다. 선택 원본은 장당 25MiB·전체 150MiB까지 받고,
  브라우저가 업로드 전에 전체 전송본을 4MiB 이하로 준비한다.
- 현재 업로드는 브라우저에서 Vercel 서울 함수를 거쳐 Supabase 서울 Storage로 전달된다.
- 피드 조회는 1시간짜리 Supabase signed URL을 발급한다.

## 목표 구조

```text
브라우저
  ├─ EXIF 방향 적용·WebP 사전 최적화
  ├─ 안정적인 요청 ID로 게시 재시도
  ├─ 게시 요청 ──> Vercel/Next.js
  │                  ├─ 인증·공개범위·차단·소유권 검증
  │                  ├─ 이미지 magic/픽셀 수 검증
  │                  ├─ EXIF 제거, WebP 재인코딩
  │                  ├─ Supabase 또는 R2 쓰기 어댑터
  │                  └─ feed.feed_post_media에 provider/key/hash/크기 기록
  │
  └─ 이미지 GET ──> media.nuang.app Worker
                     ├─ 만료·HMAC·경로 검증
                     ├─ 공개 사진: canonical key 엣지 캐시
                     ├─ 비공개 사진: 캐시 우회
                     └─ private R2 binding
```

Supabase와 R2의 객체 키를 URL로 직접 신뢰하지 않는다. 앱은 DB에 기록된 `storage_provider`와 `storage_path`만 사용하며, 서버가 현재 사용자의 피드 조회 권한을 확인한 뒤 제한 시간 URL을 발급한다.

## 성능·용량 계약

1. 모든 신규 사진은 서버에서 실제 파일 형식을 확인한다.
2. JPEG, PNG, WebP만 허용하고 애니메이션 및 손상 파일은 거부한다.
3. 입력은 최대 40MP로 제한한다.
4. EXIF 방향을 적용한 뒤 메타데이터를 제거한다.
5. 장축을 최대 1600px로 줄이고 WebP 품질 82로 저장한다.
6. UUID 기반 immutable 객체 키를 사용하고 덮어쓰지 않는다.
7. 최적화 후 크기, 원본 크기, 가로·세로, SHA-256을 DB에 기록한다.
8. R2 관리 용량은 무료 10GB보다 낮은 8GB를 기본 hard guard로 사용한다. 활성·숨김 업로드·단기 예약·미정리 객체를 모두 합산하고, 동시 요청과 고아 객체를 위한 2GB 안전 여유를 둔다.
9. 공개·프로필 공개 사진의 bearer 링크는 지연 로딩을 위해 1시간 유지하되 canonical 엣지 캐시는 60초만 유지한다. `private_draft`는 캐시하지 않는다.
10. 이미지 제공 실패가 피드 본문과 다른 기능의 렌더링을 중단시키지 않도록 미디어 항목만 생략한다.
11. 사진 게시물은 미디어가 모두 활성화되기 전까지 공개 피드와 작성자 조회에서 숨긴다.
12. 동일 초안 재시도는 같은 요청 ID를 사용하고, 네트워크 응답 유실이나 중복 클릭으로 같은 게시물이 두 번 만들어지지 않게 한다.
13. 피드 카드가 화면에 가까워지면 현재 사진과 다음 사진만 미리 불러오며, 사진을 누르면 잘리지 않은 원본 비율 뷰어를 제공한다.

8GB hard guard는 **저장 바이트**를 보호한다. R2의 Class A/B 요청 무료량은 계정 전체에 적용되는 별도 한도이며 Cloudflare가 초과 요청을 자동 차단하지 않는다. 따라서 R2 쓰기 전환 전 객체 S3 자격 증명과 분리되고 `Account Analytics Read`와 `Workers R2 Storage Read`만 가진 `CLOUDFLARE_R2_ANALYTICS_API_TOKEN`으로 계정 전체의 최근 31일 Class A/B 사용량과 대상 버킷·계정 저장량을 수집한다. billing cycle을 누락하지 않는 보수적 상한으로 70%·85% 알림, 공개 경로 rate limit, 비공개 링크 남용 차단을 함께 켠다. 이 관측이 없으면 저장 용량이 8GB 이하여도 “항상 무료”라고 판단하지 않는다.

## 보안·개인정보 계약

- R2 버킷의 `r2.dev` 공개 접근은 사용하지 않는다.
- R2 버킷은 private이며 Worker binding 또는 제한된 S3 API 자격증명만 접근한다.
- 브라우저에 R2 API access key와 signing secret을 노출하지 않는다.
- Worker URL은 bearer URL이므로 경로, 만료 시각, 캐시 모드를 HMAC에 묶는다.
- Worker는 R2 객체의 `Content-Type`이 JPEG, PNG, WebP 중 하나인지 다시 확인하고 모든 응답에 `Cross-Origin-Resource-Policy: same-site`를 적용한다.
- 객체 키에 이메일, 닉네임, 전화번호를 넣지 않는다.
- R2 API 토큰은 대상 버킷 object read/write/delete로만 제한한다.
- 객체 S3 secret, Worker delivery signing secret, read-only analytics token은 서로 다른 값으로 발급한다. Access Key ID는 16~128자의 영문·숫자 형식만 허용한다.
- signing secret을 회전할 때는 순차 `secret put`을 사용하지 않는다. 저장소 밖 권한 `0600` 임시 secrets 파일로 `current=새 값`, `previous=기존 값`을 한 Worker version에 원자 업로드·배포하고, 앱 signer를 새 값으로 전환한 뒤 기존 1시간 링크가 만료되면 `wrangler secret bulk` 한 요청에서 `current=새 값`, `previous=null`로 정리한다. current와 previous가 같거나 previous가 32자 미만이면 Worker는 503으로 닫힌다.
- 활성화 전에 개인정보 처리방침의 국외 처리·수탁자 문구와 Cloudflare DPA를 운영자가 검토하고, 완료 뒤에만 `FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED=true`로 설정한다. 코드와 환경 검증은 이 값이 없으면 카나리 쓰기도 닫는다.

## 무중단 전환 단계

### 0. 안전 기반

- DB에 `storage_provider`를 추가하되 기본값은 `supabase`로 둔다.
- 기존 앱은 새 컬럼을 무시하므로 DB를 먼저 배포할 수 있다.
- 새 앱도 R2 환경값이 없으면 반드시 Supabase에 쓴다.

### 1. 이미지 최적화

- 브라우저에서 원본 JPEG·PNG·WebP와 브라우저가 해석 가능한 HEIC/HEIF를 순차 처리한다.
- 1600px WebP 고품질부터 시작해 전체 전송본이 4MiB를 넘을 때만 단계적으로 크기와 품질을 낮춘다.
- 브라우저 미지원 시에는 기존 서버 계약을 이미 만족하는 JPEG·PNG·WebP만 원본 전송하고,
  HEIC/HEIF는 서버에 그대로 보내지 않는다.
- 공급자와 무관하게 서버 재인코딩을 먼저 활성화한다.
- 저장 용량과 다운로드 바이트 감소를 운영에서 확인한다.
- 사진이 모두 준비되기 전에는 게시·사진 추가·삭제를 막고 준비 상태를 화면에 표시한다.
- DB의 pending publication barrier와 요청 멱등키를 먼저 적용한 뒤 앱을 배포한다.
- 숨김 업로드와 삭제 실패 정리는 Supabase 단계에서도 생길 수 있으므로 cleanup secret과 정기 호출을 이 단계부터 운영한다.
- 무료 Vercel Hobby 한도에 맞춰 `vercel.json`에서 하루 한 번(UTC 18:43, 한국 시각 약 03:43) GET 정리를 실행한다. 다른 일일 작업과 분 단위를 겹치지 않게 두었지만 Hobby 크론은 지정 시간 안에서 최대 59분가량 늦을 수 있으므로 정밀 시각을 전제로 하지 않는다.
- Vercel 운영 환경의 `CRON_SECRET`에는 32자 이상의 무작위 값을 등록한다. 이 값이 없거나 짧으면 GET 정리 endpoint는 아무 작업도 하지 않고 401로 닫힌다. 수동 복구용 POST는 선택적인 `FEED_MEDIA_CLEANUP_SECRET`을 사용하며, 비어 있으면 같은 `CRON_SECRET`을 사용한다.
- 한 번의 정리 호출은 60초 함수 한도 안에서 42초 작업 예산만 사용하고, 100개 배치를 반복해 최대 3,000개까지 처리한다. 남은 시간·처리 건수·배치 횟수 상한 중 하나에 도달하면 중단하며 응답에는 경로 대신 `hasMore`와 `budgetExhausted`를 포함한 집계만 남긴다.
- Supabase와 R2 삭제는 서로 병렬로 진행하되, R2 개별 DELETE는 최대 10개만 동시에 실행하고 Supabase는 최대 100개씩 묶는다. 공급자 요청은 정리 작업 안에서 최대 8초만 기다리며 타임아웃·거부·미확인 객체는 성공으로 추정하지 않고 모두 내구성 큐에 남긴다.
- 성공한 삭제의 큐 해소와 실패한 삭제의 재등록도 최대 10개 동시성으로 제한한다. 실패나 무진행 배치는 같은 호출에서 즉시 반복하지 않아 장애 중 무한 루프와 공급자 요청 폭주를 막는다.
- 용량이 작은 DB에 정리 이력이 무한히 쌓이지 않도록, 완료된 cleanup queue 메타데이터는 14일간 보존한 뒤 같은 일일 작업에서 service-role 전용 RPC로 최대 10,000건씩 정리한다.
- 이 단계에서는 Storage 공급자가 바뀌지 않아 즉시 롤백할 설정도 없다.

### 2. R2 암전 배포

- APAC R2 버킷과 `media.nuang.app` Worker를 만든다.
- 운영 앱에 완전한 R2 환경값과 별도 read-only analytics token을 넣되 쓰기 공급자는 `supabase`로 유지한다. 운영 delivery origin은 정확히 `https://media.nuang.app`이어야 한다.
- `FEED_MEDIA_R2_ALL_CUSTOMERS=false`와 `FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED=false`를 함께 유지한다.
- Cloudflare DPA와 개인정보 문구 검토가 끝나기 전에는 `FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED=false`를 유지한다.
- 고정된 시험 객체로 Worker의 서명 거부, 만료, HIT/MISS, 삭제 동작을 확인한다.

### 3. 제한 전환

- `FEED_MEDIA_WRITE_PROVIDER=cloudflare_r2`를 설정하되
  `FEED_MEDIA_R2_ALL_CUSTOMERS=false`와
  `FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED=false`를 유지한다.
- Cloudflare DPA와 개인정보 처리방침 검토를 완료하고 `FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED=true`로 승인한 뒤에만 카나리 계정을 추가한다.
- `FEED_MEDIA_R2_CANARY_ACCOUNT_IDS`에 검증된 운영자 account UUID만 명시해 시험
  게시물부터 R2로 쓴다. 목록에 없는 고객은 같은 배포에서 계속 Supabase에 쓴다.
- 카나리 대상 판정은 인증 사용자의 뉴앙 account 연결과 게시물 소유권을 확인한 뒤에만
  수행한다. auth UUID, 이메일, 클라이언트 입력값으로 대상을 선택하지 않는다.
- 업로드 성공 후 DB 기록 실패 시 업로드한 모든 객체를 제거한다.
- DB에는 객체가 있는데 R2에 없거나, R2에는 있는데 DB에 없는 상태를 점검한다.

### 4. 신규 쓰기 전환

- 카나리의 업로드·조회·삭제·정리·용량 지표가 승인 기준을 만족하고 별도 운영 승인을 기록한 뒤에만 `FEED_MEDIA_R2_ALL_CUSTOMERS=true`와
  `FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED=true`를 같은 배포에서 설정해 신규 피드 사진 전체를 전환한다. 첫 번째 값만 true이면 환경 검증이 실패한다.
- 기존 Supabase 행은 계속 Supabase signed URL로 읽는다.
- 롤백 시 먼저 `FEED_MEDIA_R2_ALL_CUSTOMERS=false`로 전체 전환을 닫고,
  `FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED=false`로 승인을 회수한 뒤
  `FEED_MEDIA_WRITE_PROVIDER=supabase`로 되돌린다. 이미 생성된 R2 행의 읽기 경로는 유지한다.

### 5. 직접 업로드

서버 재인코딩의 품질·보안 기준이 안정화된 뒤 별도 단계로 진행한다. 브라우저 직접 PUT은 Vercel 요청 바이트를 줄이지만, 업로드 완료 전 게시물 생성, 악성 파일 검증, 고아 객체 회수, 삭제 경합을 함께 해결해야 하므로 초기 공급자 전환과 동시에 켜지 않는다.

## 롤백과 실패 처리

- R2 설정이 일부만 있거나 유효하지 않으면 R2 쓰기를 시작하지 않는다.
- R2 업로드 중 한 객체라도 실패하면 성공한 객체를 제거하고 생성된 게시물을 롤백한다.
- PUT 응답이 타임아웃되면 저장 여부를 추측하지 않고 계획한 모든 immutable key를 삭제 대상으로 취급한다.
- 새 스키마에서는 롤백할 게시물/미디어를 먼저 물리 삭제해 모든 `storage_ready=false` key를 15분 cleanup queue로 원자 이관한 뒤 공급자 DELETE를 시도한다. 따라서 404 뒤 늦은 PUT이 완료돼도 후속 정리가 다시 삭제한다.
- DB 기록이 실패하면 공급자에 관계없이 업로드 객체를 제거한다.
- 업로드 전 숨김 미디어 행은 `storage_accounted=true`로 즉시 용량에 포함한다. 프로세스가 중단되어 예약이 만료돼도 용량이 사라지지 않는다.
- 게시물 soft delete와 같은 DB 트랜잭션에서 하위 미디어의 `deleted_at`을 설정해 먼저 숨긴다. 외부 객체 삭제나 내구성 큐 등록이 확인된 뒤에만 `storage_accounted=false`로 전환한다.
- soft delete 시점에 아직 공급자 PUT을 확정하지 않은 `storage_ready=false` 행은 외부 DELETE를 시도하지 않는다. 대신 행을 물리 삭제하면 BEFORE DELETE 트리거가 DB 트랜잭션 안에서 용량 계정을 cleanup queue로 옮기고 15분 유예를 설정해, 늦게 완료된 PUT까지 안전하게 제거한다.
- `deleted_at` 기준 30분 이상 남은 숨김 미디어는 `optimized_at`이 없는 과거 행까지 정리 worker가 객체 삭제를 재확인한 뒤에만 용량에서 제외한다.
- R2 읽기 설정이 없으면 해당 미디어를 노출하지 않으며 Supabase의 같은 경로로 추측해 읽지 않는다.
- R2 행이 한 건이라도 생긴 뒤에는 `FEED_MEDIA_R2_ENABLED=true`, Worker, bucket, 현재 R2 읽기 코드를 유지한다. 신규 쓰기 롤백을 이유로 dual-read 도입 이전 앱 배포로 되돌리거나 R2 자격 증명을 제거하지 않는다.
- 물리 삭제되는 `storage_accounted=true` 미디어 행은 `BEFORE DELETE` 트리거가 같은 DB 트랜잭션에서 정리 큐로 넘긴다. `storage_ready=false`만 늦은 immutable PUT에 대비해 15분 유예하고, 활성화가 끝난 `storage_ready=true` 객체는 즉시 정리 대상으로 둔다.
- 게시물 삭제 후 객체 제거 실패는 본문 공개를 복구하지 않고 정리 대상에 남겨 재시도한다.

## 전환 승인 기준

- 이미지 최적화·스토리지 어댑터·Worker 계약 테스트 통과
- 전체 TypeScript, ESLint, Vitest, production build 통과
- Supabase 기존 업로드·조회·계정 삭제 회귀 테스트 통과
- 모바일 브라우저에서 사진 준비·재시도·중복 클릭·전체 보기·다음 사진 선로딩 확인
- R2 300KB 및 4MB 시험 파일의 서울 기준 업로드, cold GET, warm GET p50/p95 기록
- 운영자 account UUID 카나리에서 업로드·조회·삭제·정리 회귀와 Supabase 비대상 고객
  유지 확인
- R2 warm GET이 Supabase보다 느리지 않거나, 용량·비용 이점으로 허용 가능한 범위임을 확인
- R2 사용량 70%·85% 경고와 8GB 애플리케이션 hard guard 확인
- R2 저장 바이트뿐 아니라 월간 Class A/B 요청량도 70%·85% 경고와 남용 방지 규칙으로 관찰
- 카나리 활성 객체 전체(최대 100개)의 private HEAD가 DB 크기·MIME과 일치하며, 100개를 넘기기 전 확장 가능한 표본·전체 sweep 운영안을 별도 승인
- 계정 전체 Standard 저장량을 판정하고 Infrequent Access 사용이 0임을 fail-closed로 확인
- 운영 환경 검증에서 exact delivery origin, Access Key ID 형식, 서로 다른 storage/delivery/analytics secret, 전체 고객 이중 승인 게이트 확인
- 개인정보 문서와 삭제 절차 운영 검수 완료
- cleanup endpoint의 secret·호출 스케줄·실패 경보가 준비되기 전에는 R2 쓰기 전환 금지

## 이번 작업의 경계

이번 작업은 이미지 재인코딩, 공급자 구분 스키마, R2 어댑터, 비공개 캐시 Worker, 이중 읽기와 롤백 경로까지 준비한다. Cloudflare 계정의 R2 구독, 결제수단, DNS, API 토큰 생성은 외부 계정 상태를 확인한 뒤 별도로 실행한다. 해당 외부 설정 전에는 운영 쓰기 공급자를 R2로 바꾸지 않는다.
