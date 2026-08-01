# 뉴앙 광고 플랫폼 운영 시작 가이드

- 목적: 개발이 끝난 광고·제휴 기능을 실제 운영에 안전하게 연결하기
- 대상: 개발 지식이 없는 서비스 운영자
- 현재 상태: 코드는 완성되어 있지만, 아래 준비가 끝날 때까지 실제 광고와 메일은 자동으로 나오지 않음
- 중요: 비밀키는 이 문서·채팅·화면 캡처에 적지 말고 Vercel 환경변수에만 저장한다.

## 가장 먼저 알아둘 것

해야 할 일은 아래 7단계다. **위에서 아래 순서대로** 진행한다.

1. Supabase에 광고 데이터베이스 적용
2. 보안키 생성 후 Vercel에 저장
3. Resend 발신 도메인·메일 알림 연결
4. Google AdSense 사이트 승인·광고 단위 준비
5. 쿠팡 파트너스 활동 URL·소재 준비
6. 운영센터에서 캠페인과 소재 등록
7. 5% 이용자부터 안전하게 광고 열기

실제 광고를 켜기 전까지 `ADVERTISING_ENABLED=false`를 유지한다.

---

## 1. Supabase 데이터베이스 적용

Supabase 대시보드의 `SQL Editor`에서 아래 파일을 **한 번에 하나씩, 순서대로** 실행한다.

1. `supabase/migrations/202608010002_advertising_inquiry_release_1a.sql`
2. `supabase/migrations/202608010003_advertising_delivery_release_1.sql`

실행 후 앱의 `/admin/advertising`을 연다. 상단의 `데이터 연결`이 정상으로 바뀌고 문의·캠페인·인벤토리·소재 검수·성과·설정 탭이 열리면 완료다.

오류가 나면 같은 SQL을 반복 실행하기 전에 오류 전문과 어느 파일에서 발생했는지를 기록해 Codex에 전달한다.

## 2. 보안키 생성 및 Vercel 저장

Mac의 터미널에서 아래 명령을 각각 실행한다. 출력된 값은 서로 바꾸어 쓰지 않는다.

```bash
openssl rand -base64 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Vercel 프로젝트의 `Settings > Environment Variables`에 다음처럼 저장한다.

| 환경변수 | 넣을 값 |
| --- | --- |
| `FIELD_ENCRYPTION_KEY` | 첫 번째 `openssl rand -base64 32` 결과 |
| `AD_CONTACT_HASH_PEPPER` | 두 번째 결과 |
| `AD_EVENT_SESSION_PEPPER` | 세 번째 결과 |
| `AD_OUTBOX_CRON_SECRET` | 네 번째 결과 |

모두 `Production` 환경에 등록한다. 기존 `FIELD_ENCRYPTION_KEY`로 이미 다른 정보를 암호화하고 있다면 **교체하지 말고 기존 값을 그대로 사용**한다. 이 키를 바꾸면 기존 암호화 문의를 읽을 수 없게 된다.

아래 운영 정보도 확인하거나 등록한다.

- `NEXT_PUBLIC_APP_ORIGIN`: 실제 서비스의 `https://` 주소
- `AD_INQUIRY_NOTIFICATION_EMAILS`: 문의 알림을 받을 운영자 이메일. 여러 개면 쉼표로 구분
- `LEGAL_OPERATOR_NAME`: 실제 서비스 운영 주체명
- `PRIVACY_CONTACT_EMAIL`: 개인정보 문의 이메일
- `SUPABASE_DATA_REGION`: Supabase 대시보드에 표시된 실제 리전

## 3. Resend 메일 연결

### 3-1. 발신 도메인 인증

1. Resend에서 발신 전용 하위 도메인을 추가한다. 예: `notice.서비스도메인`
2. Resend가 안내한 SPF·DKIM DNS 레코드를 도메인 관리 서비스에 등록한다.
3. Resend의 도메인 상태가 `Verified`가 될 때까지 기다린다.
4. 가능하면 DMARC도 추가한다.

Resend는 발신 평판을 분리하기 위해 하위 도메인 사용을 권장하며, SPF와 DKIM 인증이 필요하다. 공식 안내: <https://resend.com/docs/dashboard/domains/introduction>

### 3-2. API와 발신 주소 등록

Resend에서 발송 전용 API Key를 만들고 Vercel에 등록한다.

| 환경변수 | 예시가 아닌 실제 값 |
| --- | --- |
| `RESEND_API_KEY` | Resend가 한 번만 보여주는 `re_...` 키 |
| `AD_INQUIRY_FROM` | `NUANG Business <business@인증한도메인>` |

API Key는 외부에 공개하지 않는다. Resend 공식 안내: <https://resend.com/docs/dashboard/api-keys/introduction>

### 3-3. 발송 결과 webhook 연결

1. Resend의 `Webhooks > Add Webhook`을 연다.
2. URL에 `https://실제서비스주소/api/internal/advertising/email-webhook`을 입력한다.
3. 최소한 `email.delivered`, `email.bounced`, `email.complained` 이벤트를 선택한다.
4. 생성 후 표시되는 signing secret을 Vercel의 `AD_RESEND_WEBHOOK_SECRET`에 저장한다.

Resend webhook은 공개 HTTPS 주소를 요구하며 실패 시 재시도한다. 공식 안내: <https://resend.com/docs/webhooks/introduction>

### 3-4. 메일 재시도 예약 작업 연결

Supabase Cron이 다음 주소를 1분마다 호출하도록 설정한다. 문의 저장 직후에는 즉시 발송을 시도하며, 이 작업은 **첫 발송에 실패했고 재시도 시간이 된 메일만** 다시 처리한다. 정상 발송된 메일은 대상에 포함되지 않는다.

- 방식: `GET` 또는 `POST`
- 주소: `https://실제서비스주소/api/internal/advertising/outbox/drain`
- 헤더: `Authorization: Bearer AD_OUTBOX_CRON_SECRET에 저장한 값`

적용 파일: `supabase/migrations/202608020001_advertising_mail_outbox_retry_cron.sql`

Supabase Vault에는 아래 두 비밀값을 저장한다. 실제 값은 코드나 문서에 기록하지 않는다.

| Vault 이름 | 값 |
| --- | --- |
| `nuang_app_origin` | `https://nuang.app` |
| `nuang_ad_outbox_cron_secret` | Vercel의 `AD_OUTBOX_CRON_SECRET`과 같은 값 |

재시도 간격은 첫 실패 후 1분, 두 번째 실패 후 5분, 이후 30분·2시간으로 늘어나며 최대 5회까지만 시도한다. Cron은 1분마다 대기열을 확인하지만 `pending` 또는 `retry` 상태이고 `next_attempt_at`이 지난 행만 잠금 처리하므로 정상 메일과 아직 재시도 시간이 되지 않은 메일은 발송하지 않는다.

## 4. Google AdSense 준비

1. AdSense의 `Sites`에서 실제 뉴앙 운영 도메인을 추가한다.
2. 사이트 소유권을 확인하고 검토를 요청한다.
3. `Ready` 승인이 완료될 때까지 기다린다. Google은 승인 전에는 광고를 게재할 수 없다고 안내한다: <https://support.google.com/adsense/answer/12131223>
4. `Ads`에서 **수동 반응형 디스플레이 광고 단위** 하나를 만든다. 자동 광고, 앵커, 비네트, 전면 광고는 켜지 않는다.
5. 게시자 ID와 숫자 광고 슬롯 ID를 Vercel에 등록한다.

| 환경변수 | 값 |
| --- | --- |
| `ADSENSE_PUBLISHER_ID` | `ca-pub-...` 또는 `pub-...` 게시자 ID |
| `ADSENSE_HOME_SLOT_ID` | 홈 수동 광고 단위의 숫자 슬롯 ID |

6. AdSense의 `Privacy & messaging`에서 개인정보 메시지와 유럽 지역 동의 설정을 준비한다. 공식 안내: <https://support.google.com/adsense/answer/10924669>, <https://support.google.com/adsense/answer/7670013>
7. 배포 후 `https://실제서비스주소/ads.txt`에 본인의 게시자 ID가 표시되는지 확인한다. AdSense에서 `Authorized`가 될 때까지 기다린다. 공식 안내: <https://support.google.com/adsense/answer/12171612>
8. 정책센터에서 민감 카테고리와 부적절한 광고주 URL 차단 설정을 확인한다.

본인이나 운영자는 실제 Google 광고를 클릭해서는 안 된다. 화면 검수는 광고 바깥의 배치와 여백만 확인한다.

## 5. 쿠팡 파트너스 준비

1. 쿠팡 파트너스에 실제 서비스와 사용할 활동 URL을 등록한다.
2. 피드에서 소개할 상품 또는 카테고리를 고른다.
3. 파트너스에서 생성한 공식 이동 링크와 사용이 허용된 정적 이미지 주소를 준비한다.
4. 등록 시점의 쿠팡 파트너스 약관·공지에서 필수 대가성 문구와 이미지 사용 조건을 다시 확인한다.
5. 링크와 이미지의 정확한 hostname을 쉼표로 구분해 Vercel에 등록한다. `https://` 전체 URL이 아니라 `link.coupang.com` 같은 hostname만 입력한다.

| 환경변수 | 값 |
| --- | --- |
| `COUPANG_ALLOWED_DESTINATION_HOSTS` | 승인된 이동 링크 hostname 목록 |
| `COUPANG_ALLOWED_IMAGE_HOSTS` | 승인된 이미지 hostname 목록 |

뉴앙은 다음 고지를 카드 첫 부분에 고정 표시한다.

> 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.

가격·할인율·배송 보장처럼 바뀔 수 있는 정보는 소재 문구에 직접 적지 않는다.

## 6. 운영센터에 캠페인과 소재 등록

`/admin/advertising`에서 아래 순서로 등록한다.

### AdSense

1. `캠페인` 탭에서 공급자 `AdSense`, 위치 `HOME_INLINE_01`로 캠페인을 만든다.
2. 기간과 상태를 검토한다.
3. AdSense는 외부에서 소재가 결정되므로 뉴앙 소재 탭에서 개별 광고 이미지를 만들지 않는다.

### 쿠팡 파트너스

1. `캠페인` 탭에서 공급자 `쿠팡`, 위치 `FEED_COMMERCE_01`로 캠페인을 만든다.
2. `소재 검수`에서 공식 링크, 정적 이미지, 제목, 설명, 대체 텍스트를 입력한다.
3. 정책 고지·권리·사실 확인 항목을 실제로 확인한 뒤 승인한다.
4. 미리보기에서 광고 표기, 공식 고지, 모바일 줄바꿈, 이미지 비율을 확인한다.

임시 링크나 확인하지 않은 이미지는 승인하지 않는다. 소재 URL을 바꾸면 다시 검수한다.

## 7. 광고를 5%부터 안전하게 열기

처음부터 100%로 열지 않는다. 다음 순서를 지킨다.

### 7-1. Vercel 준비값

외부 승인과 개인정보 설정이 실제로 끝난 항목만 `true`로 바꾼다.

```text
ADVERTISING_ENABLED=true

ADSENSE_ENABLED=true
ADSENSE_SITE_READY=true
ADSENSE_PRIVACY_READY=true
ADSENSE_CSP_REPORT_ONLY_READY=true
ADSENSE_EEA_CMP_READY=true

COUPANG_PARTNERS_ENABLED=true
COUPANG_POLICY_READY=true
```

AdSense 또는 쿠팡 한쪽이 아직 준비되지 않았다면 그 공급자의 값은 `false`로 둔다.

### 7-2. 운영센터 개방 순서

1. `인벤토리`에서 해당 위치를 활성화하고 rollout을 `5%`로 저장한다.
2. 캠페인·소재가 승인 상태인지 확인한다.
3. `설정`에서 먼저 슬롯 긴급 중지를 해제한다.
4. 다음으로 해당 공급자 긴급 중지를 해제한다.
5. 마지막으로 전역 긴급 중지를 해제한다.

초기 데이터는 인벤토리 비활성·rollout 0%·긴급 중지 상태다. 순서를 빠뜨려도 광고가 잘못 노출되지 않도록 설계되어 있다.

### 7-3. 실제 화면 확인

- 홈 추천: 주제검사 3개 다음, 함께하기 섹션 전에 AdSense 한 개만 보이는지 확인
- 커뮤니티 추천: 공개 게시물 8개 다음에 쿠팡 카드 한 개만 보이는지 확인
- 검사 문항·결과 리포트·함께하기 게임·마이·운영센터에는 광고가 없는지 확인
- 모바일에서 광고가 화면 밖으로 넘치지 않고 주요 버튼을 밀지 않는지 확인
- 광고가 채워지지 않았을 때 빈 테두리나 오류 문구가 남지 않는지 확인
- **실제 광고 자체는 클릭하지 않기**

### 7-4. 5% 이후 확대 기준

최소 2~3일 동안 다음 문제가 없을 때만 `25% → 50% → 100%`로 한 단계씩 높인다.

- 홈 검사 시작률이나 피드 체류가 뚜렷하게 하락하지 않음
- 광고 숨김·불편 신고가 급증하지 않음
- 모바일 화면 밀림과 로딩 오류가 없음
- AdSense 정책센터 경고가 없음
- 쿠팡 소재의 링크·이미지·고지가 현재도 정확함

문제가 생기면 운영센터의 해당 슬롯 긴급 중지를 먼저 켠 뒤 원인을 확인한다.

---

## 마지막 완료 확인표

- [ ] SQL 002와 003을 순서대로 실행했다.
- [ ] `/admin/advertising` 데이터 연결이 정상이다.
- [ ] 네 개의 보안키를 Vercel에 저장했다.
- [ ] Resend 도메인, API Key, webhook, 예약 작업을 연결했다.
- [ ] 실제 문의 1건으로 문의자 확인 메일과 운영자 알림 메일을 받았다.
- [ ] AdSense 사이트가 `Ready`, ads.txt가 `Authorized`다.
- [ ] AdSense 수동 반응형 슬롯과 개인정보 메시지를 준비했다.
- [ ] 쿠팡 활동 URL, 공식 링크, 이미지, 필수 고지를 확인했다.
- [ ] 운영센터에서 캠페인·소재를 승인했다.
- [ ] 5% rollout으로 열고 모바일·데스크톱을 확인했다.
- [ ] 검사·결과·함께하기·마이·운영센터에 광고가 없음을 확인했다.

이 문서는 운영 연결이 끝날 때까지 보관한다. 모든 항목이 끝난 뒤 사용자가 삭제를 요청하면 삭제한다.
