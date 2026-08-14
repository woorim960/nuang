# 뉴앙 한국어 스토어 등록 문안

기준일: 2026-08-11<br>
원본 데이터: `config/mobile-store-listing.ko-KR.json`

이 문서는 Apple App Store Connect와 Google Play Console에 그대로 옮길 수 있는 한국어 등록 문안이다. 실제 입력 전에는 JSON 원본을 `npm run mobile:store-metadata:check`로 검사한다.

## 공통 등록 정보

| 항목                       | 값                                        |
| -------------------------- | ----------------------------------------- |
| 앱 이름                    | 뉴앙                                      |
| Bundle ID / Application ID | `app.nuang.mobile`                        |
| 운영 주체                  | 딱좋은라이프                              |
| 공개 개발자명              | 뉴앙                                      |
| 고객지원                   | `https://nuang.app/support`               |
| 개인정보 처리방침          | `https://nuang.app/policies/privacy`      |
| 개인정보 선택·계정 삭제    | `https://nuang.app/help/account-deletion` |
| 마케팅 URL                 | `https://nuang.app`                       |
| 광고 포함                  | 예                                        |
| 인앱 결제·구독             | 아니요                                    |
| 계정 생성                  | 예, 만 14세 이상                          |
| 비회원 이용                | 일부 검사·결과·공유 가능                  |

## Apple App Store

- 이름: `뉴앙`
- 부제: `성향 테스트와 관계형 SNS`
- 주 카테고리: Lifestyle
- 부 카테고리: Social Networking
- 출시 방식: 심사 승인 후 수동 출시
- 키워드: `성향테스트,성격테스트,심리테스트,밸런스게임,관계테스트,친구궁합`
- 저작권: `2026 딱좋은라이프`

프로모션 문구:

> 코어·주제 검사로 나를 알아보고, 밸런스 게임과 커뮤니티에서 친구·연인과 서로의 생각을 발견해 보세요.

설명 전문은 JSON의 `appleAppStore.description`을 사용한다. Apple은 이름·부제를 각 30자, 프로모션 문구를 170자, 설명을 4,000자, 키워드를 UTF-8 100바이트로 제한하므로 자동 검사한다.

## Google Play

- 앱 이름: `뉴앙`
- 카테고리: Lifestyle
- 짧은 설명: `성향 테스트와 밸런스 게임으로 나를 알아보고, 친구와 생각을 나누는 관계형 SNS`
- 광고 포함: 예
- 타겟층 후보: 만 13~~15세, 16~~17세, 18세 이상

긴 설명 전문은 JSON의 `googlePlay.fullDescription`을 사용한다. 이름 30자, 짧은 설명 80자, 긴 설명 4,000자를 자동 검사한다.

### 연령 선택 주의

뉴앙 정책은 만 14세 이상이지만 Google Console의 연령 구간은 `13~15`로 묶여 있다. 14~15세 사용자를 실제 대상으로 하므로 이 구간을 숨기면 안 된다. 다만 일부 국가에서는 이 구간이 아동을 포함할 수 있어 가족 정책 검토가 함께 필요하다.

현재 서버는 `14-18` 연령대 계정과 운영자 계정에 광고를 노출하지 않도록 fail-closed 처리한다. 콘솔에서는 이를 사실대로 설명하고, 스토어 심사 전 실제 기기에서 미성년 계정 광고 미노출을 다시 검증한다.

## 문안 원칙

- 뉴앙을 MBTI 또는 의료·심리 진단으로 표시하지 않는다.
- 검증되지 않은 정확도·우월성·1위 표현을 쓰지 않는다.
- 가격, 할인, 순위, 다른 앱 이름을 키워드에 넣지 않는다.
- 실제 구현되지 않은 기능을 스크린샷이나 설명에 약속하지 않는다.
- 앱 기능 또는 개인정보 처리가 바뀌면 JSON과 양 스토어 공개 내용을 함께 갱신한다.

## 공식 기준

- Apple App Store Connect 앱 정보: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/
- Apple 플랫폼 버전 정보: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Google Play 앱 설정: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play 스토어 등록정보 권장사항: https://support.google.com/googleplay/android-developer/answer/13393723
- Google Play 계정 삭제: https://support.google.com/googleplay/android-developer/answer/13327111
