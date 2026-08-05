# 뉴앙 계정 삭제·재가입 운영 검증 기록

- 검증일: 2026-08-05 (Asia/Seoul)
- 운영 도메인: `https://nuang.app`
- 적용 migration: `202608050010_account_deletion_reregistration.sql`
- 범위: 계정 데이터 파기, 운영 산출물의 담당자 익명화, 동일 OAuth 재가입, Google·Kakao 계정 연결과 양쪽 재로그인

## 1. 법률·정책 판정

탈퇴한 소셜 로그인 제공자 식별값을 영구 보존해 재가입을 막아야 한다는 일반 의무는 확인되지 않았다. 개인정보 보호법 제21조는 보유기간 경과나 처리 목적 달성 등으로 불필요해진 개인정보를 지체 없이 파기하고, 다른 법령상 보존 의무가 있는 경우에만 다른 개인정보와 분리해 보관하도록 정한다. 시행령 제16조는 전자적 파일을 복원이 불가능한 방법으로 영구 삭제하도록 정한다.

뉴앙은 다음 원칙을 적용한다.

1. 계정 삭제 시 OAuth provider subject, Auth 사용자, 프로필, 검사, 게시물, 관계, 동의, 분석 등 계정 연결 데이터를 영구 삭제한다.
2. 같은 Google·Kakao 계정으로 다시 가입할 수 있지만 이전 계정이나 데이터와 연결하지 않는다.
3. 삭제 성공 감사에는 계정 ID, Auth 사용자 ID, provider, 이메일, 연락처를 남기지 않고 삭제 건수만 기록한다.
4. 운영자가 만든 공식 콘텐츠·발행 결과는 서비스 산출물로 유지하되 탈퇴한 담당자 FK를 `null`로 바꿔 개인 연결을 제거한다.
5. 결제·청약철회·민원처럼 실제 법정 보존 대상이 존재하는 경우에만 최소 기록을 서비스 데이터와 분리해 법정 기간 동안 보관한 뒤 삭제한다. 현재 뉴앙 무료 베타 계정 삭제 자체를 이유로 별도 거래기록을 만들지 않는다.

공식 근거:

- 개인정보 보호법 제21조: https://www.law.go.kr/LSW/lsLinkCommonInfo.do?ancYnChk=&chrClsCd=010202&lsJoLnkSeq=1020398651
- 개인정보 보호법 시행령 제16조: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0016&lsiSeq=286175&urlMode=lsScJoRltInfoR
- 전자상거래법 시행령 제6조의 거래기록 보존 예외: https://www.law.go.kr/LSW/lsInfoP.do?chrClsCd=010202&efYd=20160930&lsId=&lsiSeq=186737&urlMode=lsEfInfoR&viewCls=lsRvsDocInfoR

이 문서는 제품·데이터 구조에 대한 내부 사전검토 기록이며 변호사의 개별 법률 자문을 대신하지 않는다.

## 2. 구현 변경

- 기존 `deleted_auth_identity_tombstone` 행을 모두 삭제하고 신규 기록을 중단했다.
- 일반 회원탈퇴가 운영자·검토자 FK 때문에 실패하지 않도록 user-owned 행은 cascade 삭제하고 운영 산출물의 담당자 FK는 `ON DELETE SET NULL`로 익명화했다.
- 계정 병합 case는 계정 삭제 시 cascade 삭제한다.
- 발행된 검사 콘텐츠는 그대로 immutable 상태를 유지하며, 계정 삭제에 따른 `published_by → null` 변경만 허용한다.
- 기존 identity 감사 이벤트의 직접 계정·Auth 식별자, provider 목록, correlation ID를 삭제한다.
- 삭제 UI와 약관·처리방침에 영구 삭제, 재가입 가능, 이전 데이터 미복구, 실제 법정 보존 예외를 함께 안내한다.

## 3. 운영 삭제 결과

사용자가 명시적으로 삭제를 승인한 다음 두 기존 운영 계정을 삭제했다.

- Google `WOORIM PARK`
- Kakao `박우림`

삭제 후 검증:

| 검사 | 결과 |
| --- | ---: |
| 기존 `identity.account` | 0건 |
| 기존 `profile.community_profile` | 0건 |
| 기존 `identity.auth_identity` | 0건 |
| 기존 Supabase Auth 사용자 | 모두 404, 0건 |
| 기존 account ID를 참조하는 모든 FK | 0건 |
| 재가입 차단 tombstone | 0건 |

삭제는 복구할 수 없다. Supabase Free에는 사용자 복원용 자동 백업이 없으며, 공급자 인프라 로그는 각 공급자의 짧은 운영 보존기간이 적용될 수 있다.

## 4. 재가입·연결 E2E

1. 운영 로그인 화면에서 삭제했던 `WOORIM PARK` Google 계정으로 로그인 — 통과
2. 이전 데이터 없는 새 뉴앙 프로필 생성 — 통과
3. 새 Google 계정에 삭제했던 Kakao 계정 연결 — 통과
4. 운영 DB에서 Google·Kakao 두 identity가 같은 `account_id`와 `supabase_user_id`를 가리킴 — 통과
5. 로그아웃 후 Kakao로 로그인해 같은 새 handle과 0개 게시물·0개 검사 결과 확인 — 통과
6. 다시 로그아웃 후 Google로 로그인해 같은 새 handle과 0개 게시물·0개 검사 결과 확인 — 통과

최종 판정: 계정 완전 삭제, 동일 OAuth 재가입, Google→Kakao 수동 연결, Kakao·Google 양쪽 재로그인과 데이터 분리가 모두 통과했다.
