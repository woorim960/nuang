# 157. Runtime resolver 인터페이스와 harness v2.3

- 상태: `PURE_RESOLVER_AND_UNIT_HARNESS_READY_NOT_APP_WIRED`
- resolver export: **2개**
- 필수 source token: **6/6**
- 단위 시험 계약: **5/5**
- 합성 profile 참조: **9216개**
- 앱 route 연결 / 운영 allowlist: **0 / 0**

## 구현한 경계

- exact canonical ID·version·surface allowlist·manifest digest를 함께 확인한다.
- retired·COMMON·research_only 문장을 제외한다.
- privacyScope가 맞지 않는 비교·프로필·공유 노출을 차단한다.
- 제외된 canonical ID는 고객 payload에 포함하지 않고 서버 진단 수치로만 센다.
- 32개 성향의 9,216개 연구 참조가 고객 payload에 한 건도 나오지 않는 합성 시험을 포함한다.

관련 테스트:

```bash
npx vitest run src/features/nuang-code/trait-map-runtime-resolver-v2.test.ts
```

현재 앱 route, DB read, 캐시 purge worker에는 연결하지 않았다.
