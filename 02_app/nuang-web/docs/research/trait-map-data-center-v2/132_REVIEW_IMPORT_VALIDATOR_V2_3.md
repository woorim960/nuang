# v2.3 검토 import validator

- 알려진 canonical: 605
- 입력 event: 0
- error: 0
- warning: 1
- import 가능: false
- commit: false

기본 실행은 빈 template의 구조가 맞는지만 검사한다. 빈 template는
오류가 없더라도 실제 event가 없으므로 import할 수 없다. 실제 파일은
canonical ID와 version, reviewer 역할·자격·이해충돌, issue code, event
중복, 근거 event, SHA-256, 시간 순서를 모두 통과해야 영향 dry-run으로
넘어간다.

사용 예:

```bash
node scripts/validate-trait-map-v2-3-review-import.mjs \
  --input=/absolute/path/to/review-import.json
```
