# v2.3 revision 영향 dry-run 엔진

## 현재 실행

- 실제 revision proposal: 0
- blocking error: 0
- commit: false
- 원장 변경: 0

실제 판정이 아직 없으므로 빈 import template로 실행했고 원장을 바꾸지
않았다. 대신 합성 self-test 한 건으로 영향 계산 코드가 profile
8개와 이웃 edge
28개를 찾고 새 version의
승인 초기화 작업을 생성하는지 확인했다. 이 self-test는 import되지 않는다.

## 실제 proposal이 들어오면

1. 문구 수정은 해당 canonical을 참조하는 profile·surface를 갱신한다.
2. 축·방향·퇴역은 같은 claim 전체와 32개 profile을 재조합한다.
3. privacy·surface 변경은 모든 발행 allowlist를 다시 계산한다.
4. 새 version은 과거 승인을 이어받지 않고 인지 재시험·역할 재검토로 간다.
5. dry-run error가 하나라도 있으면 commit 후보를 만들지 않는다.

사용 예:

```bash
node scripts/generate-trait-map-v2-3-revision-impact-dry-run.mjs \
  --input=/absolute/path/to/review-import.json
```
