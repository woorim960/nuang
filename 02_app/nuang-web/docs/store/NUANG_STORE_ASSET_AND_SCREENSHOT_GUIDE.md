# 뉴앙 스토어 이미지·스크린샷 가이드

기준일: 2026-08-11

## 자동 생성 완료 자산

| 스토어 | 용도             | 파일                                                                 | 규격                          |
| ------ | ---------------- | -------------------------------------------------------------------- | ----------------------------- |
| Apple  | App Store 아이콘 | `public/icons/nuang-app-store-icon-1024.png`                         | 1024×1024, 불투명 PNG         |
| Google | Play 아이콘      | `public/images/store/nuang-google-play-icon-512.png`                 | 512×512, 32-bit PNG, 1MB 이하 |
| Google | 피처 그래픽      | `public/images/store/nuang-google-play-feature-graphic-1024x500.png` | 1024×500, 불투명 PNG          |

생성·검사:

```bash
npm run mobile:assets
npm run mobile:store-assets:check
npm run mobile:screenshot-plan:check
```

피처 그래픽은 뉴앙의 기존 메인 캐릭터 5종 중 3종만 사용한다. Google 화면에서 아이콘과 나란히 노출될 수 있으므로 아이콘을 크게 반복하지 않고, 중앙 안전 영역에 캐릭터와 브랜드 분위기를 배치했다.

## 실제 화면 캡처 원칙

스크린샷은 아직 생성 완료로 처리하지 않는다. 현재 `mobile/` 화면은 네이티브 브리지 검증용 내부 화면이므로 이를 스토어에 올리면 실제 제품을 오해하게 만든다. P0 앱 UI가 완성된 서명 후보 빌드에서만 캡처한다.

- Apple 기본 세트: 6.9인치 세로 `1320×2868`, 1~10장
- Google 휴대전화 세트: 세로 `1080×1920`, 4~8장 권장
- Apple에는 알파 채널 없는 PNG/JPEG를 사용한다.
- 운영자의 실제 개인정보·실사용자 게시물·전화번호·이메일은 캡처에 넣지 않는다.
- 고정 데모 계정과 운영 승인된 가상 콘텐츠만 사용한다.
- 첫 3장은 홈, 코어 결과, 밸런스 게임처럼 핵심 앱 UI가 크게 보이게 한다.
- 과장된 정확도·의료 진단·MBTI 공식 서비스로 오해할 문구를 넣지 않는다.

장면과 데이터 상태는 `config/mobile-store-screenshot-plan.json`을 단일 원본으로 사용한다. 동일 장면을 iOS·Android에서 재현하되 실제 플랫폼 UI 차이를 억지로 합성하지 않는다.

## 캡처 후 승인 조건

1. 버전·빌드번호가 제출 후보와 일치한다.
2. 모든 화면이 현재 앱 기능과 일치한다.
3. 로그인·성향 코드·프로필 등 데모 데이터가 화면 간 일관된다.
4. 상태바, safe area, 하단 내비게이션, 키보드가 잘리지 않는다.
5. 디자이너 검토본과 실제 캡처 원본을 함께 보존한다.
6. 콘솔 업로드 후 기기별 자동 축소 미리보기를 다시 확인한다.

위 조건과 실제 기기 QA를 통과한 뒤에만 `storeScreenshotsCaptured`를 `true`로 바꾼다.

## 공식 규격

- Apple 스크린샷 업로드: https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
- Apple 스크린샷 크기: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Google Play 미리보기 자산: https://support.google.com/googleplay/android-developer/answer/9866151
