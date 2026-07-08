# NUANG Pre-Credential QA Checklist

이 체크리스트는 Supabase/OAuth credential을 요청하기 전까지 계속 진행 가능한 작업과, 실제로 사용자 도움이 필요한 blocker를 분리하기 위한 기준이다.

## 빠른 결론

지금 사용자 도움이 필요하지 않은 작업:

- 로컬 검사 UX 개선
- 결과 리포트 문구와 seed QA
- 별난 성향 연구소 콘텐츠 QA
- 도움 허브와 안전 문구 정리
- 닫힌 API schema/contract 테스트 보강
- 공유/계정 준비중 UI 정리
- 운영 문서와 runbook 정리

사용자 도움이 필요해지는 작업:

- 실제 Google/Kakao 소셜 로그인 오픈
- Naver custom OAuth/OIDC 구현
- Supabase project URL/key 입력
- service role key와 database URL 입력
- 배포 도메인과 OAuth callback URL 확정
- 법률/개인정보 처리방침 최종 검토

## 필수 QA 명령

반복 개발 중에는 credential 없이 빠른 pre-credential 상태를 확인한다.

```bash
npm run qa:precredential:fast
```

이 명령은 아래를 순서대로 실행한다.

```bash
npm run env:check
npm run typecheck
npm run lint
npm run test
```

출시 후보나 큰 UI 변경 후에는 build까지 포함해 전체 pre-credential 상태를 확인한다.

```bash
npm run qa:precredential
```

이 명령은 아래를 순서대로 실행한다.

```bash
npm run env:check
npm run typecheck
npm run lint
npm run test
npm run build
```

build만 분리해서 확인할 때는 아래 명령을 사용한다.

```bash
npm run qa:precredential:build
```

Codex 샌드박스에서 Turbopack build가 내부 포트 바인딩 권한 때문에 실패하면, `npm run build`만 샌드박스 밖 권한으로 재실행해 확인한다. 일반 로컬 터미널에서는 `qa:precredential` 전체가 통과해야 한다.

## Credential 없이 통과해야 하는 조건

앱 실행:

- `NEXT_PUBLIC_SUPABASE_URL`이 없어도 로컬 앱이 실행된다.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 없어도 로컬 검사와 결과가 실행된다.
- `/my?auth=env_missing`는 사용자용 닫힘 상태를 보여준다.

검사:

- 빠른 코어 시작/완료 가능
- 정밀 코어 시작/완료 가능
- 직접 응답은 이 기기에 저장
- 결과 계산은 로컬에서 동작

결과:

- 로컬 결과 리포트 열람 가능
- 로컬 결과 삭제 가능
- 로컬 데이터 export 가능
- 결과 이미지 저장 가능
- 계정 저장은 준비중으로 명확히 표시

공유:

- 실제 공유 링크는 생성하지 않음
- `/share/[token]`은 fake result를 보여주지 않음
- 공개 공유 설명은 summary-only 원칙과 일치
- noindex 유지

도움/안전:

- 자살·자해·우울·ADHD·중독·트라우마·사이코패스·폭력·성적 지향·약물 등은 재미형 검사로 열지 않음
- 민감 주제는 도움 허브와 안전 안내로 연결
- 도움 허브는 109·119·112 긴급 연락과 공식 안내 링크를 제공
- 도움 항목 선택은 계정, 결과, 성향지도, 비교 리포트에 저장하지 않음

문서:

- README에서 현재 열린 기능과 닫힌 기능을 구분
- credential 요청 시점이 명확함
- 계정 저장·공유 API runbook이 최신 계약과 일치

## Credential 전 의도적으로 닫힌 기능

아래는 버그가 아니라 의도적인 닫힘 상태다.

- 소셜 로그인 session
- 로컬 결과 계정 저장
- 공유 링크 생성
- 공유 링크 철회
- 공개 공유 token active 조회
- 장기 계정 저장
- 계정 데이터 server export
- 계정 동의 관리 server sync
- 공개 프로필 기반 1:1 비교

## 실제 Blocker

외부 입력이 필요한 blocker:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- Google OAuth dashboard credential
- Kakao OAuth dashboard credential
- Naver custom OAuth/OIDC 방식 결정
- 배포 origin
- OAuth callback allowlist
- 개인정보처리방침/이용약관 최종 문안

내부 구현 blocker:

- result claim DB write 구현
- share link create/revoke DB write 구현
- public share token hash lookup 구현
- RLS 실제 적용·검증
- 삭제·철회 server job
- 계정 데이터 server export
- 관리자 감사 로그

출시 blocker:

- 공개 MVP prelaunch gate 통과 전까지 NO-GO
- 법률/개인정보 문서 미완료
- RLS 미검증
- 직접 응답 client select 가능
- 공유 링크 만료/철회 미검증
- 민감 검사존 오픈
- 결제/구독 UI 오픈

## 계속 진행 가능한 다음 작업 후보

credential 없이 계속 가능한 작업:

- 로컬 결과 리포트 접근성 QA
- 성향지도 모바일 시각 QA
- 검사 홈/마이/함께 탭 copy QA
- 별난 성향 연구소 추가 주제 seed QA
- 도움 허브 리소스 정리
- admin NO-GO 상태판 polish
- public share unavailable 상태별 UI 준비
- DB migration lint 문서화

credential이 들어온 뒤 진행할 작업:

- OAuth callback E2E
- 계정 claim DB write E2E
- 공유 링크 생성·철회 E2E
- RLS policy 실제 쿼리 검증
- 배포 origin 기반 callback 재검증

## 사용자에게 물어야 하는 시점

다음 조건 중 하나가 되었을 때만 사용자에게 도움을 요청한다.

- 소셜 로그인 실제 오픈을 시작할 때
- Supabase project를 실제 연결할 때
- 배포 도메인/callback URL이 필요할 때
- 법률 문안 최종 승인 필요할 때
- Naver OAuth 방식을 결정해야 할 때

그 전에는 로컬 앱, 문구, 테스트, 문서, 닫힌 상태 계약을 계속 개선한다.
