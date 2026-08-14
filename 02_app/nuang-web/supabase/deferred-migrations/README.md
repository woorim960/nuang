# Deferred Supabase migrations

이 디렉터리의 SQL은 검토 중인 보류 작업이며 Supabase CLI의 활성 마이그레이션 경로가 아니다.

- `manifest.json`에 템플릿 경로, 원래 버전, SHA-256, 보류 사유를 기록한다.
- 보류 파일을 `supabase/migrations`에 동시에 두지 않는다.
- 템플릿 파일명에는 배포 버전을 넣지 않는다. 활성화 조건을 모두 검증한 뒤 manifest 항목과 템플릿을 제거하는 같은 변경에서 최신 버전의 새 활성 마이그레이션을 만들고 별도 검수·배포한다. `deferred` 항목과 같은 SQL 본문을 활성 경로에 동시에 두면 검사가 실패한다.
- 적용 이력이 있는 SQL은 수정하지 않고 후속 마이그레이션을 추가한다.
- `applied-migrations.lock.json`에는 운영 적용과 원격 이력 확인이 끝난 뒤에만 새 항목을 추가한다.
- 자동화에서 전체 이력을 일괄 전송하는 Supabase DB push 명령을 사용하지 않는다.

`node scripts/check-supabase-migrations.mjs`가 이 계약과 적용 완료 SQL의 체크섬을 검사한다.
