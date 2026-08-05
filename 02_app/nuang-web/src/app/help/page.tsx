import {
  ArrowLeft,
  Brain,
  ChevronDown,
  ExternalLink,
  HeartHandshake,
  Info,
  MessageCircle,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import {
  helpBoundaries,
  helpPrivacyNotice,
  helpResources,
  sourceLinks,
  urgentCallActions,
  urgentSteps,
  type HelpResource,
} from "@/features/help/help-resources";
import { createPublicPageMetadata } from "@/features/seo/site-config";
import styles from "./page.module.css";

export const metadata: Metadata = createPublicPageMetadata({
  description:
    "지금 도움이 필요할 때 112·119와 공식 상담 연락처를 빠르게 확인하세요. 이 화면에서 누른 내용은 뉴앙에 저장하지 않아요.",
  path: "/help",
  title: "위기·상담 도움 연락처",
});

type IconComponent = ComponentType<{
  "aria-hidden"?: boolean | "true" | "false";
  size?: number | string;
  strokeWidth?: number | string;
}>;

const resourceIcon: Record<HelpResource["id"], IconComponent> = {
  "mental-health-1577": Brain,
  "suicide-109": HeartHandshake,
  "violence-1366": Shield,
  "welfare-129": Info,
  "youth-1388": Users,
};

export default function HelpPage() {
  return (
    <main className={styles.screen}>
      <header className={styles.topBar}>
        <Link aria-label="홈으로 돌아가기" href="/home">
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.7} />
        </Link>
        <h1>도움받기</h1>
        <span aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <p>혼자 버티지 않아도 괜찮아요</p>
        <h2>
          지금 필요한 도움을
          <br />
          바로 찾을 수 있어요.
        </h2>
        <div className={styles.privacyLine}>
          <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.65} />
          <span>이 화면에서 누른 내용은 뉴앙에 저장하지 않아요.</span>
        </div>
      </section>

      <section
        aria-labelledby="urgent-help-title"
        className={styles.urgentSection}
      >
        <div className={styles.urgentHeading}>
          <span className={styles.urgentIcon}>
            <ShieldAlert aria-hidden="true" size={22} strokeWidth={1.7} />
          </span>
          <div>
            <p>즉시 도움이 필요할 때</p>
            <h2 id="urgent-help-title">지금 다칠 위험이 있다면</h2>
          </div>
        </div>

        <ol className={styles.urgentSteps}>
          {urgentSteps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>

        <div className={styles.urgentActions}>
          {urgentCallActions.map((action) => (
            <a
              aria-label={action.ariaLabel}
              data-variant={action.variant}
              href={action.href}
              key={action.label}
            >
              <span>
                <small>{action.description}</small>
                <strong>{action.label}</strong>
              </span>
              <Phone aria-hidden="true" size={18} strokeWidth={1.75} />
            </a>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="help-resource-title"
        className={styles.resourceSection}
      >
        <div className={styles.sectionHeading}>
          <MessageCircle aria-hidden="true" size={19} strokeWidth={1.65} />
          <h2 id="help-resource-title">상황에 맞는 도움</h2>
        </div>

        <div className={styles.resourceList}>
          {helpResources.map((resource) => (
            <ResourceRow key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      <section className={styles.policySection}>
        <details>
          <summary>
            <span>
              <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.65} />
              개인정보와 안내 기준
            </span>
            <ChevronDown aria-hidden="true" size={18} strokeWidth={1.65} />
          </summary>
          <div className={styles.policyBody}>
            <p>{helpPrivacyNotice}</p>
            <ul>
              {helpBoundaries.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </details>

        <details>
          <summary>
            <span>
              <Info aria-hidden="true" size={19} strokeWidth={1.65} />
              공식 안내 확인
            </span>
            <ChevronDown aria-hidden="true" size={18} strokeWidth={1.65} />
          </summary>
          <div className={styles.policyBody}>
            <p>
              연락처는 2026년 7월 28일 공식 기관 안내에서 확인했습니다. 운영
              시간과 지원 범위는 기관 사정에 따라 달라질 수 있어요.
            </p>
            <div className={styles.sourceList}>
              {sourceLinks.map((source) => (
                <a
                  aria-label={`${source.label} 공식 안내 새 창에서 열기`}
                  href={source.href}
                  key={source.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.label}
                  <ExternalLink
                    aria-hidden="true"
                    size={14}
                    strokeWidth={1.6}
                  />
                </a>
              ))}
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}

function ResourceRow({ resource }: { resource: HelpResource }) {
  const Icon = resourceIcon[resource.id] ?? HeartHandshake;

  return (
    <article className={styles.resourceRow} data-tone={resource.tone}>
      <div className={styles.resourceHeader}>
        <span className={styles.resourceIcon}>
          <Icon aria-hidden="true" size={21} strokeWidth={1.65} />
        </span>
        <div className={styles.resourceTitle}>
          <p>{resource.availability}</p>
          <h3>{resource.title}</h3>
        </div>
      </div>

      <p className={styles.resourceSummary}>{resource.summary}</p>
      <p className={styles.resourceFit}>{resource.fit.join(" · ")}</p>

      <div className={styles.resourceActions}>
        {resource.phone ? (
          <a
            aria-label={`${resource.title} ${resource.phone}로 전화하기`}
            className={styles.callAction}
            href={`tel:${resource.phone}`}
          >
            <Phone aria-hidden="true" size={17} strokeWidth={1.75} />
            {resource.phone} 전화
          </a>
        ) : null}
        {resource.href ? (
          <a
            aria-label={`${resource.title} 공식 안내 새 창에서 열기`}
            className={styles.guideAction}
            href={resource.href}
            rel="noreferrer"
            target="_blank"
          >
            공식 안내
            <ExternalLink aria-hidden="true" size={15} strokeWidth={1.65} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
