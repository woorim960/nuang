# 뉴앙 모바일 출시 — 계정 소유자만 가능한 작업

기준일: 2026-08-11

아래 작업만 박우림 계정 소유자가 직접 해야 한다. 이유는 신분증 촬영, 본인 명의 결제, OTP, 법적 약관 동의 또는 한 번만 내려받을 수 있는 비밀키가 필요하기 때문이다. 코드·문안·이미지·검증 자동화는 저장소에서 준비한다.

## 1. Apple Developer Program 가입

공식 시작: https://developer.apple.com/programs/enroll/

1. 본인 Apple Account에 이중 인증을 켠다.
2. Apple Developer 앱에서 `Individual`로 가입한다.
3. 이름은 `박우림`의 신분증상 법적 이름을 입력한다. `뉴앙`이나 `딱좋은라이프`를 성·이름 칸에 넣지 않는다.
4. 전화번호는 `010-2515-0939`를 사용한다.
5. Apple 신원 확인 주소에는 **본인의 현재 법적 주소**를 입력한다. 우편사서함은 허용되지 않는다.
6. 전달한 사업장 주소가 본인의 Apple Account 법적 주소와 실제로 동일할 때만 그대로 사용한다. 다르면 사업장 주소로 맞추지 말고 실제 개인 주소를 Apple 포털에 비공개로 입력한다. 이 개인 주소는 나에게 전달하거나 저장소에 넣을 필요가 없다.
7. 본인 신분증 촬영·약관 동의·연회비 결제를 완료한다.

Apple은 개인사업자/1인 사업자를 개인으로 가입하도록 안내하며 판매자명은 법적 개인 이름으로 표시한다. 앱 이름은 별도로 `뉴앙`을 사용한다.

완료 후 알려줄 값: 가입 완료 여부와 10자리 Team ID. 비밀번호·OTP·결제정보는 보내지 않는다.

## 2. Google Play 조직 계정 준비

공식 계정 유형 안내: https://support.google.com/googleplay/android-developer/answer/13634885?hl=ko-kr

1. D&B에서 `딱좋은라이프` D‑U‑N‑S 번호를 무료 조회·신청한다.
2. D&B 정보는 다음 사업자 자료와 한 글자도 다르지 않게 맞춘다.
   - 법적 사업자명: `딱좋은라이프`
   - 대표자: `박우림`
   - 사업자등록번호: `768-75-00424`
   - 주소: `경기도 파주시 고봉로 755-27, 201-E280호(상지석동, 갤러리하우스상가)`
3. Google Payments 조직 프로필도 D&B와 같은 법적 이름·주소를 사용한다.
4. Play Console에서 `Organization`을 선택한다.
5. 공개 개발자명은 `뉴앙`으로 입력한다.
6. 개발자 이메일 `woorimprog@gmail.com`과 전화번호 `010-2515-0939`의 OTP 인증을 완료한다.
7. 본인·사업자 문서 제출, 약관 동의, 등록비 결제를 완료한다.

2026-08-11 진행 상태:

- `woorimprog@gmail.com`의 Play Console에서 조직 유형 `회사 또는 비즈니스`를 선택했다.
- 공개 개발자명 `뉴앙`을 입력했다.
- Google Payments 조직 프로필 생성 직전의 D‑U‑N‑S 입력 단계까지 진행했다.
- 국내 공식 파트너 NICE D&B에 `딱좋은라이프`의 기존 번호 조회 또는 무료 신규 발급 절차 문의를 사업자 정보와 함께 접수했다.
- NICE D&B 회신으로 9자리 번호가 확인되면 해당 번호 입력부터 이어간다. 번호를 추측하거나 다른 사업자의 번호를 넣지 않는다.

Google 조직 계정의 법적 주소는 D&B·결제 프로필·증빙 문서가 일치해야 한다. 다른 주소를 임의로 넣으면 안 된다. 현재 전달한 주소를 그대로 사용한다.

완료 후 알려줄 값: D‑U‑N‑S 번호, Play Console 계정 생성 완료 여부. 신분증 사본·결제정보·OTP는 보내지 않는다.

## 3. 개발 도구 상태와 남은 본인 확인

- Android Studio Quail 3 Patch 1(2026.1), Android CLI, SDK Platform 36, Build Tools 36.0.0, Platform Tools 37.0.1 설치를 완료했다.
- Homebrew OpenJDK 21.0.12로 `assembleDebug`를 실행해 뉴앙 APK가 실제 생성되는 것까지 검증했다.
- 현재 macOS 15.4.1에는 Xcode 26을 설치할 수 없다. Apple 공식 호환표상 Xcode 26.0~26.3은 macOS Sequoia 15.6 이상이 필요하다.
- 호환되는 macOS Sequoia 15.7.9 업데이트 파일은 다운로드를 완료했다. 계정 소유자가 설치·재시작을 승인한 뒤 Xcode 26.3을 Apple Developer Downloads에서 설치한다.
- Mac App Store 최신 Xcode 26.6은 macOS Tahoe 26.2 이상을 요구하므로, 불필요한 메이저 OS 업그레이드를 피하기 위해 Sequoia에서는 Xcode 26.3을 사용한다.
- Xcode 설치 후 최초 실행에서 Apple 약관과 추가 구성요소 설치는 계정 소유자가 직접 승인한다.

설치 후 저장소에서 다음 명령만 실행하면 내가 상태를 판정할 수 있다.

```bash
npm run mobile:toolchain:check
```

## 4. 계정 생성 뒤에만 가능한 포털 작업

계정 가입이 끝나면 다음은 화면을 함께 보면서 대부분 내가 안내·검증할 수 있다. 다만 Apple `.p8` 다운로드와 비밀 입력, 콘솔 OTP·약관 승인은 본인이 직접 한다.

- Apple App ID·Services ID·Sign in with Apple Key 생성
- Supabase Apple provider 비밀 입력
- Apple Team ID 기반 Universal Links 설정
- Play App Signing SHA‑256 지문 확인과 Android App Links 설정
- 전용 심사 계정 생성·비공개 심사란 입력
- TestFlight·Play Internal testing 초대 승인
- 최종 `Submit for Review` 클릭

세부 Apple 절차는 `docs/store/NUANG_APPLE_SIGN_IN_SETUP_RUNBOOK.md`에 있다.

## 5. 완료를 알려주는 가장 간단한 형식

민감정보 없이 다음처럼 알려주면 된다.

```text
macOS 15.7.9 설치·재시작 완료
Apple 로그인 완료
Apple 가입 완료 / Team ID: __________
Google D-U-N-S: __________
Google Play 조직 계정 완료
Xcode 26.3 설치·최초 실행 완료
```

그 다음부터 인증서 연결, 앱 빌드, 테스트 트랙 업로드, 실제 기기 검증, 스토어 입력과 심사 전 검사는 이어서 처리한다.
