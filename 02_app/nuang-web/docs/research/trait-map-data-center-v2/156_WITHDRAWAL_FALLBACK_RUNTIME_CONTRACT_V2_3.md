# 156. 철회와 fallback runtime 계약 v2.3

- 상태: `FAIL_CLOSED_RUNTIME_CONTRACT_READY_NOT_WIRED`
- resolver 합성 시험: **6/6 통과**
- 검사한 profile 참조: **9216개**
- 합성 철회 영향 성향: **16개**
- 현재 운영 allowlist: **0개**
- runtime 연결: **아직 안 함**

## 기본 동작

- 승인 상태·정확한 version·surface allowlist·privacyScope·manifest digest를 모두 통과해야 렌더링한다.
- 결정이 없거나 문장이 사라졌으면 해당 section을 생략한다.
- 철회 문장, COMMON, 반대 축 문장, 미승인 최신 초안을 fallback으로 사용하지 않는다.
- rollback version도 명시적으로 승인된 경우에만 사용한다.
- 철회 시 결과·성향지도·비교·프로필·공유·서버·클라이언트 캐시를 함께 무효화한다.

## 현재 경계

합성 철회만 계산했으며 canonical, 32개 profile, DB, 발행 manifest, 앱 runtime은 변경하지 않았다. 운영 허용 canonical은 계속 0개다.
