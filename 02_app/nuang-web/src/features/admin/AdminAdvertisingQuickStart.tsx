import Link from "next/link";
import { BetaSampleSponsorBanner } from "@/features/advertising/delivery/BetaSampleSponsorBanner";
import styles from "./AdminAdvertisingQuickStart.module.css";

const steps = [
  ["문의 확인", "광고하려는 내용, 희망 기간, 이동 주소를 먼저 확인합니다."],
  ["조건 협의", "7일 단위 기간·금액·수정 횟수·입금일을 광고주와 정합니다."],
  [
    "캠페인 등록",
    "문의와 연결된 캠페인을 초안으로 만들고 슬롯과 일정을 넣습니다.",
  ],
  [
    "소재 검수",
    "이미지 권리, 광고 표시, 문구, 대체 텍스트와 목적지를 확인합니다.",
  ],
  [
    "실제 화면 확인",
    "아래와 같은 앱 너비에서 글자 잘림과 이미지 초점을 봅니다.",
  ],
  [
    "예약·송출",
    "입금과 최종 승인을 확인한 뒤 예약하고 처음에는 낮은 비율로 엽니다.",
  ],
  [
    "종료·보고",
    "노출·외부 이동·숨김·불편 의견을 정리해 광고주에게 전달합니다.",
  ],
] as const;

export function AdminAdvertisingQuickStart() {
  return (
    <section
      aria-labelledby="advertising-quick-start-title"
      className={styles.guide}
    >
      <header className={styles.heading}>
        <div>
          <p>처음 운영하는 사람을 위한 안내</p>
          <h2 id="advertising-quick-start-title">
            문의가 오면 아래 순서대로 처리하세요
          </h2>
        </div>
        <Link href="/advertise" target="_blank">
          사용자가 보는 광고 안내
        </Link>
      </header>

      <div className={styles.layout}>
        <div className={styles.steps}>
          <ol>
            {steps.map(([title, detail], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.typeGuide}>
            <div>
              <strong>광고주 배너</strong>
              <span>
                광고주가 이미지와 링크를 전달하고 뉴앙이 기간을 정해 노출
              </span>
            </div>
            <div>
              <strong>쿠팡 파트너스</strong>
              <span>
                운영자가 쿠팡에서 허용된 링크와 소재를 골라 제휴 카드로 노출
              </span>
            </div>
          </div>
        </div>

        <aside aria-label="홈 광고 모바일 미리보기" className={styles.preview}>
          <div className={styles.previewHeading}>
            <div>
              <span>실제 앱 너비</span>
              <strong>홈 추천 · 광고주 배너</strong>
            </div>
            <em>390px</em>
          </div>
          <div className={styles.phoneCanvas}>
            <div className={styles.homeLead}>
              <span>생활 속 나를 알아보기</span>
              <strong>지금 궁금한 내 모습을 골라보세요</strong>
              <i />
              <i />
            </div>
            <BetaSampleSponsorBanner preview />
            <div className={styles.homeTail}>
              <span>2~8명이 함께</span>
              <strong>우리, 얼마나 비슷하게 고를까요?</strong>
            </div>
          </div>
          <p>
            현재 이미지는 베타 레이아웃 확인용 자체 제작 예시입니다. 실제 광고가
            아니며 성과 집계에도 포함하지 않습니다.
          </p>
        </aside>
      </div>
    </section>
  );
}
