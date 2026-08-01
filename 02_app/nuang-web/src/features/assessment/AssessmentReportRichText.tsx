import type {
  FreeTopicLongReportBlock,
  FreeTopicLongReportSection,
} from "@/features/assessment/free-topic-assessments";
import styles from "./AssessmentReportRichText.module.css";

export function AssessmentReportRichText({
  labelLayout = "compact",
  section,
  variant = "default",
}: {
  labelLayout?: "compact" | "wide";
  section: Pick<FreeTopicLongReportSection, "blocks" | "body">;
  variant?: "accordion" | "default";
}) {
  const blocks = section.blocks ?? parseLegacyReportBody(section.body);

  return (
    <div
      className={`${styles.root} ${
        labelLayout === "wide" ? styles.wideLabels : ""
      } ${variant === "accordion" ? styles.accordion : ""}`}
    >
      {blocks.map((block, index) => (
        <ReportBlock block={block} index={index} key={blockKey(block, index)} />
      ))}
    </div>
  );
}

function ReportBlock({
  block,
  index,
}: {
  block: FreeTopicLongReportBlock;
  index: number;
}) {
  if (block.kind === "ordered_list") {
    return (
      <ol className={styles.orderedList}>
        {block.items.map((item, itemIndex) => (
          <li key={`${itemIndex}:${item}`}>
            <span aria-hidden="true">{itemIndex + 1}</span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (block.kind === "labeled_list") {
    return (
      <dl className={styles.labeledList}>
        {block.items.map((item) => (
          <div key={`${item.label}:${item.text}`}>
            <dt>{item.label}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <p className={index === 0 ? styles.firstParagraph : ""}>{block.text}</p>
  );
}

export function parseLegacyReportBody(
  body: string,
): FreeTopicLongReportBlock[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph): FreeTopicLongReportBlock[] => {
      const lines = paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const numberedItems = lines.map((line) =>
        line.match(/^\d+\.\s+(.+)$/)?.[1]?.trim(),
      );

      if (
        lines.length > 1 &&
        numberedItems.every((item): item is string => Boolean(item))
      ) {
        return [{ items: numberedItems, kind: "ordered_list" }];
      }

      return [{ kind: "paragraph", text: lines.join(" ") }];
    });
}

function blockKey(block: FreeTopicLongReportBlock, index: number) {
  if (block.kind === "paragraph") return `${index}:${block.text}`;
  return `${index}:${block.kind}:${block.items.length}`;
}
