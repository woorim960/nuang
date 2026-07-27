# v2.3 독립 검토·인지 면담 import 계약

## 왜 필요한가

독립 검토와 인지 면담 결과를 수기 메모로만 남기면 어느 문장 버전을
검토했는지, 수정 뒤 승인이 여전히 유효한지 재현할 수 없다. 모든 판정은
불변 event로 가져오고 정정도 기존 기록을 덮지 않는다.

- canonical registry: 605개
- 독립 역할: 7개
- event 규칙: 10개
- 현재 import 판정: 0건

## 핵심 안전 규칙

- 작성자 자기검토·AI dry run·합성 자료를 독립 승인으로 인정하지 않음
- 한 역할이라도 revise이면 교정·재조합·인지 재시험
- 문구나 축이 바뀌면 새 version이며 과거 승인을 승계하지 않음
- 구성개념·근거·안전 반대를 다수결로 무시하지 않음
- 알 수 없는 ID나 중복 event가 있으면 batch 전체 rollback

## 생성 자산

- `review/TRAIT_MAP_REVIEW_IMPORT_SCHEMA_V2_3.json`
- `review/TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json`

다음 단계는 revision proposal이 영향을 주는 32개 성향, 한 글자 이웃,
surface와 기존 승인을 commit 전에 계산하는 dry-run 엔진이다.
