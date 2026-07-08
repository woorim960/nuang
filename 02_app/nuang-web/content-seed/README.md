# NUANG Content Seed

문항, 채점 규칙, 리포트 템플릿, 대표 성향 이름, 동의 문구 seed가 들어갈 영역이다.

초기 규칙:

- 공개 콘텐츠는 `ACTIVE` 이후 직접 수정하지 않는다.
- 문항 매핑과 대표 성향 이름은 코드에 하드코딩하지 않는다.
- 공개 전에는 권리, 민감도, 금지 문구 검사를 통과해야 한다.
- 별난 성향 연구소 release manifest는 `labs/`에 두고, 앱 코드와 slug·민감도·문항 수가 어긋나지 않게 테스트한다.
- 별난 성향 연구소 결과 문구는 `labs/odd-trait-lab-result-copy.v0.1.json`에 버전 seed로 보관하고, 앱 결과 문구와 일치해야 한다.
- 코어 결과 리포트 문구는 `reports/core-result-copy.v0.1.json`에 버전 seed로 보관하고, 앱 결과 생성 함수와 골든 테스트로 일치해야 한다.
