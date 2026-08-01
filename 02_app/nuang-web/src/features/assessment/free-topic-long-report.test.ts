import { describe, expect, it } from "vitest";
import {
  buildFreeTopicResultReport,
  calculateFreeTopicResult,
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
} from "@/features/assessment/free-topic-assessments";
import { buildApologyStyleNuangCodeSection } from "@/features/assessment/apology-style-long-report";
import { buildComfortStyleNuangCodeSection } from "@/features/assessment/comfort-style-long-report";
import { buildFocusSwitchNuangCodeSection } from "@/features/assessment/focus-switch-long-report";
import { buildHurtExpressionNuangCodeSection } from "@/features/assessment/hurt-expression-long-report";
import { buildOrganizingStyleNuangCodeSection } from "@/features/assessment/organizing-style-long-report";
import { buildRechargeRoutineNuangCodeSection } from "@/features/assessment/recharge-routine-long-report";
import { countFreeTopicLongReportCharacters } from "@/features/assessment/free-topic-long-report";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";

describe("professional free-topic report", () => {
  it("uses four items for each apology-style scale", () => {
    const questions = getFreeTopicQuestions("apology-style");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(12);
    expect(countByScale).toEqual({
      impact_listening: 4,
      repair_planning: 4,
      responsibility_acknowledgement: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    expect([
      ...new Set(questions.map((question) => question.contextLabel)),
    ]).toHaveLength(4);
  });

  it("produces at least 2,000 personalized characters for all 125 apology combinations", () => {
    const assessment = getFreeTopicAssessment("apology-style")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((responsibility) => {
      values.forEach((listening) => {
        values.forEach((followup) => {
          const report = buildFreeTopicResultReport({
            assessment,
            result: {
              observations: [],
              scoresByScaleId: {
                impact_listening: listening,
                repair_planning: followup,
                responsibility_acknowledgement: responsibility,
              },
              scoresByTargetId: {},
            },
          });
          const claimIds = report.longReportSections.flatMap(
            (section) => section.claimIds,
          );

          expect(
            countFreeTopicLongReportCharacters(report.longReportSections),
            `${responsibility}/${listening}/${followup} 조합 분량 부족`,
          ).toBeGreaterThanOrEqual(2_000);
          expect(report.personalizedSummary?.title).toBeTruthy();
          expect(report.personalizedSummary?.steps).toHaveLength(3);
          expect(new Set(claimIds).size).toBe(claimIds.length);
          expect(JSON.stringify(report.longReportSections)).not.toContain(
            "그럴 수도 있고",
          );
        });
      });
    });
  });

  it("describes apology extremes and tied directions without choosing one arbitrarily", () => {
    const assessment = getFreeTopicAssessment("apology-style")!;
    const buildReport = (
      responsibility: number,
      listening: number,
      followup: number,
    ) =>
      buildFreeTopicResultReport({
        assessment,
        result: {
          observations: [],
          scoresByScaleId: {
            impact_listening: listening,
            repair_planning: followup,
            responsibility_acknowledgement: responsibility,
          },
          scoresByTargetId: {},
        },
      });

    expect(buildReport(0, 0, 0).personalizedSummary?.title).toBe(
      "사과할 때 긴 대화보다 먼저 상황이 가라앉을 시간을 둬요",
    );
    expect(buildReport(100, 100, 100).personalizedSummary?.title).toBe(
      "잘못을 인정하고 상대 마음을 들은 뒤, 다음 행동까지 정해요",
    );
    expect(buildReport(50, 50, 50).personalizedSummary?.title).toBe(
      "사과할 때 책임·상대 마음·다음 행동을 상황에 맞게 챙겨요",
    );

    const tiedHigh = buildReport(100, 100, 25);
    const tiedHighRelationship = tiedHigh.longReportSections.find(
      (section) => section.title === "사람에 따라 이렇게 적용해 보세요",
    );
    expect(tiedHigh.personalizedSummary?.title).toBe(
      "잘못을 인정하고 상대가 힘들었던 점을 먼저 들어요",
    );
    expect(tiedHighRelationship?.body).toContain("내가 놓친 점 인정하기");
    expect(tiedHighRelationship?.body).toContain("상대의 마음 듣기");

    const tiedLow = buildReport(100, 25, 25);
    const tiedLowPractice = tiedLow.longReportSections.find(
      (section) => section.title === "다음에 써볼 한마디",
    );
    expect(tiedLowPractice?.body).toContain("상대의 마음 듣기");
    expect(tiedLowPractice?.body).toContain("다음 행동 정하기");
  });

  it("builds the apology code section from every result owner's five-letter code", () => {
    Object.entries(candidateProfileDefinitions).forEach(([code, profile]) => {
      const section = buildApologyStyleNuangCodeSection({
        code,
        scoresByScaleId: {
          impact_listening: 75,
          repair_planning: 50,
          responsibility_acknowledgement: 100,
        },
      });
      const labeledList = section?.blocks?.find(
        (block) => block.kind === "labeled_list",
      );

      expect(section?.title).toContain(code);
      expect(section?.body).toContain(profile.displayName);
      expect(section?.body).not.toContain("이 점수를 바꾸지");
      expect(section?.claimIds).toHaveLength(5);
      if (!labeledList || labeledList.kind !== "labeled_list") {
        throw new Error(`Missing apology code list for ${code}`);
      }
      expect(labeledList.items).toHaveLength(5);
      expect(labeledList.items.map((item) => item.label[0])).toEqual(
        code.split(""),
      );
    });
  });

  it("uses four common scenes for each hurt-expression behavior", () => {
    const questions = getFreeTopicQuestions("hurt-expression");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(12);
    expect(countByScale).toEqual({
      change_request: 4,
      feeling_expression: 4,
      specific_event_expression: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    [...new Set(questions.map((question) => question.contextLabel))].forEach(
      (contextLabel) => {
        expect(
          questions.filter(
            (question) => question.contextLabel === contextLabel,
          ),
        ).toHaveLength(3);
      },
    );
  });

  it("produces a safe 2,000-character hurt-expression report for all 125 combinations", () => {
    const assessment = getFreeTopicAssessment("hurt-expression")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((event) => {
      values.forEach((feeling) => {
        values.forEach((request) => {
          const report = buildFreeTopicResultReport({
            assessment,
            result: {
              observations: [],
              scoresByScaleId: {
                change_request: request,
                feeling_expression: feeling,
                specific_event_expression: event,
              },
              scoresByTargetId: {},
            },
          });
          const claimIds = report.longReportSections.flatMap(
            (section) => section.claimIds,
          );
          const serialized = JSON.stringify(report.longReportSections);

          expect(
            countFreeTopicLongReportCharacters(report.longReportSections),
            `${event}/${feeling}/${request} 조합 분량 부족`,
          ).toBeGreaterThanOrEqual(2_000);
          expect(report.personalizedSummary?.steps).toHaveLength(3);
          expect(new Set(claimIds).size).toBe(claimIds.length);
          expect(serialized).not.toContain("표현 능력이 부족");
          expect(serialized).not.toContain("회피형");
          expect(serialized).not.toContain("애착유형");
        });
      });
    });
  });

  it("keeps hurt-expression extremes and tied directions explicit", () => {
    const assessment = getFreeTopicAssessment("hurt-expression")!;
    const buildReport = (event: number, feeling: number, request: number) =>
      buildFreeTopicResultReport({
        assessment,
        result: {
          observations: [],
          scoresByScaleId: {
            change_request: request,
            feeling_expression: feeling,
            specific_event_expression: event,
          },
          scoresByTargetId: {},
        },
      });

    expect(buildReport(0, 0, 0).personalizedSummary?.title).toBe(
      "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요",
    );
    expect(buildReport(100, 100, 100).personalizedSummary?.title).toBe(
      "서운한 일과 내 마음을 짚고, 바라는 변화까지 말해요",
    );
    expect(buildReport(50, 50, 50).personalizedSummary?.title).toBe(
      "서운한 일·마음·바라는 점을 상황에 맞게 골라 말해요",
    );

    const tiedHigh = buildReport(100, 100, 25);
    expect(tiedHigh.personalizedSummary?.title).toBe(
      "무슨 일이 있었고 내가 어땠는지 분명히 말해요",
    );
    expect(
      tiedHigh.personalizedSummary?.steps.map((step) => step.label),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("서운한 일 짚기"),
        expect.stringContaining("내 마음 전하기"),
        expect.stringContaining("바라는 변화 말하기"),
      ]),
    );

    const tiedLow = buildReport(100, 25, 25);
    const nextPhrase = tiedLow.longReportSections.find(
      (section) => section.title === "다음에 써볼 한마디",
    );
    expect(nextPhrase?.body).toContain("내 마음 전하기");
    expect(nextPhrase?.body).toContain("바라는 변화 말하기");
  });

  it("builds the hurt-expression code section from all 32 owner codes", () => {
    Object.entries(candidateProfileDefinitions).forEach(([code, profile]) => {
      const section = buildHurtExpressionNuangCodeSection({
        code,
        scoresByScaleId: {
          change_request: 50,
          feeling_expression: 75,
          specific_event_expression: 100,
        },
      });
      const labeledList = section?.blocks?.find(
        (block) => block.kind === "labeled_list",
      );

      expect(section?.title).toContain(code);
      expect(section?.body).toContain(profile.displayName);
      expect(section?.body).not.toContain("이 점수를 바꾸지");
      expect(section?.claimIds).toHaveLength(5);
      if (!labeledList || labeledList.kind !== "labeled_list") {
        throw new Error(`Missing hurt-expression code list for ${code}`);
      }
      expect(labeledList.items).toHaveLength(5);
      expect(labeledList.items.map((item) => item.label[0])).toEqual(
        code.split(""),
      );
    });
  });

  it("produces a safe 2,000-character recharge report for all 125 combinations", () => {
    const assessment = getFreeTopicAssessment("recharge-routine")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((quiet) => {
      values.forEach((connection) => {
        values.forEach((action) => {
          const report = buildFreeTopicResultReport({
            assessment,
            result: {
              observations: [],
              scoresByScaleId: {
                gentle_reactivation: action,
                quiet_detachment: quiet,
                supportive_connection: connection,
              },
              scoresByTargetId: {},
            },
          });
          const claimIds = report.longReportSections.flatMap(
            (section) => section.claimIds,
          );
          const serialized = JSON.stringify(report.longReportSections);

          expect(
            countFreeTopicLongReportCharacters(report.longReportSections),
            `${quiet}/${connection}/${action} 조합 분량 부족`,
          ).toBeGreaterThanOrEqual(2_000);
          expect(report.personalizedSummary?.steps).toHaveLength(3);
          expect(new Set(claimIds).size).toBe(claimIds.length);
          expect(serialized).not.toContain("의지 부족");
          expect(serialized).not.toContain("번아웃 진단");
          expect(serialized).not.toContain("회복 능력이 낮");
        });
      });
    });
  });

  it("builds the recharge code section from all 32 owner codes", () => {
    Object.entries(candidateProfileDefinitions).forEach(([code, profile]) => {
      const section = buildRechargeRoutineNuangCodeSection({
        code,
        scoresByScaleId: {
          gentle_reactivation: 50,
          quiet_detachment: 75,
          supportive_connection: 100,
        },
      });
      const labeledList = section?.blocks?.find(
        (block) => block.kind === "labeled_list",
      );

      expect(section?.title).toContain(code);
      expect(section?.body).toContain(profile.displayName);
      expect(section?.claimIds).toHaveLength(5);
      if (!labeledList || labeledList.kind !== "labeled_list") {
        throw new Error(`Missing recharge code list for ${code}`);
      }
      expect(labeledList.items).toHaveLength(5);
      expect(labeledList.items.map((item) => item.label[0])).toEqual(
        code.split(""),
      );
    });
  });

  it("produces a safe 2,000-character focus-switch report for all 125 combinations", () => {
    const assessment = getFreeTopicAssessment("focus-switch")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((cue) => {
      values.forEach((goal) => {
        values.forEach((entry) => {
          const report = buildFreeTopicResultReport({
            assessment,
            result: {
              observations: [],
              scoresByScaleId: {
                goal_reorientation: goal,
                resumption_cue: cue,
                small_reentry: entry,
              },
              scoresByTargetId: {},
            },
          });
          const claimIds = report.longReportSections.flatMap(
            (section) => section.claimIds,
          );
          const serialized = JSON.stringify(report.longReportSections);

          expect(
            countFreeTopicLongReportCharacters(report.longReportSections),
            `${cue}/${goal}/${entry} 조합 분량 부족`,
          ).toBeGreaterThanOrEqual(2_000);
          expect(report.personalizedSummary?.steps).toHaveLength(3);
          expect(new Set(claimIds).size).toBe(claimIds.length);
          expect(serialized).not.toContain("의지 부족");
          expect(serialized).not.toContain("ADHD 진단");
          expect(serialized).not.toContain("집중 능력이 낮");
        });
      });
    });
  });

  it("builds the focus-switch code section from all 32 owner codes", () => {
    Object.entries(candidateProfileDefinitions).forEach(([code, profile]) => {
      const section = buildFocusSwitchNuangCodeSection({
        code,
        scoresByScaleId: {
          goal_reorientation: 50,
          resumption_cue: 75,
          small_reentry: 100,
        },
      });
      const labeledList = section?.blocks?.find(
        (block) => block.kind === "labeled_list",
      );

      expect(section?.title).toContain(code);
      expect(section?.body).toContain(profile.displayName);
      expect(section?.claimIds).toHaveLength(5);
      if (!labeledList || labeledList.kind !== "labeled_list") {
        throw new Error(`Missing focus-switch code list for ${code}`);
      }
      expect(labeledList.items).toHaveLength(5);
      expect(labeledList.items.map((item) => item.label[0])).toEqual(
        code.split(""),
      );
    });
  });

  it("uses four direct items for each independent comfort scale", () => {
    const questions = getFreeTopicQuestions("comfort-style");
    const countByScale = questions.reduce<Record<string, number>>(
      (counts, question) => {
        const scaleId = question.reportScaleId ?? "missing";
        counts[scaleId] = (counts[scaleId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(questions).toHaveLength(12);
    expect(countByScale).toEqual({
      autonomy_pacing: 4,
      collaborative_problem_solving: 4,
      emotional_acknowledgement: 4,
    });
    expect(questions.filter((question) => question.isReverse)).toHaveLength(0);
    expect(questions.map((question) => question.text).join(" ")).toMatch(
      /곁에 있어|함께 있어/,
    );
    expect(questions.map((question) => question.text).join(" ")).toMatch(
      /나누어 맡|첫 단계는 같이/,
    );
    expect(questions.map((question) => question.text).join(" ")).toMatch(
      /혼자 정리|조용한 곳|다른 데로 주의|다른 활동/,
    );
    expect(
      [...new Set(questions.map((question) => question.contextLabel))].length,
    ).toBe(4);
    [...new Set(questions.map((question) => question.contextLabel))].forEach(
      (contextLabel) => {
        expect(
          questions.filter(
            (question) => question.contextLabel === contextLabel,
          ),
        ).toHaveLength(3);
      },
    );
  });

  it("produces a non-diagnostic 2,000-character comfort report for all 125 combinations", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((emotional) => {
      values.forEach((practical) => {
        values.forEach((pacing) => {
          const report = buildFreeTopicResultReport({
            assessment,
            result: {
              observations: [],
              scoresByScaleId: {
                autonomy_pacing: pacing,
                collaborative_problem_solving: practical,
                emotional_acknowledgement: emotional,
              },
              scoresByTargetId: {},
            },
          });
          const claimIds = report.longReportSections.flatMap(
            (section) => section.claimIds,
          );
          const serialized = JSON.stringify(report.longReportSections);

          expect(
            countFreeTopicLongReportCharacters(report.longReportSections),
            `${emotional}/${practical}/${pacing} 조합 분량 부족`,
          ).toBeGreaterThanOrEqual(2_000);
          expect(new Set(claimIds).size).toBe(claimIds.length);
          expect(serialized).not.toContain("공감 능력이 높");
          expect(serialized).not.toContain("회피형 애착");
          expect(serialized).not.toContain("우울 가능성");
        });
      });
    });
  });

  it("produces a direct, safe organizing-style report for all 625 combinations", () => {
    const assessment = getFreeTopicAssessment("organizing-style")!;
    const values = [0, 25, 50, 75, 100];

    values.forEach((structure) => {
      values.forEach((capture) => {
        values.forEach((reset) => {
          values.forEach((batch) => {
            const report = buildFreeTopicResultReport({
              assessment,
              result: {
                observations: [],
                scoresByScaleId: {
                  adaptive_reset: reset,
                  batch_reset: batch,
                  stable_structure: structure,
                  visible_capture: capture,
                },
                scoresByTargetId: {},
              },
            });
            const claimIds = report.longReportSections.flatMap(
              (section) => section.claimIds,
            );
            const serialized = JSON.stringify(report.longReportSections);

            expect(
              countFreeTopicLongReportCharacters(report.longReportSections),
              `${structure}/${capture}/${reset}/${batch} 조합 분량 부족`,
            ).toBeGreaterThanOrEqual(2_000);
            expect(report.personalizedSummary?.steps).toHaveLength(4);
            expect(
              report.longReportSections.some(
                (section) => section.title === "강점과 약점, 다음 개선점",
              ),
            ).toBe(true);
            expect(
              report.longReportSections.some(
                (section) =>
                  section.title === "조금씩 정리할까, 한꺼번에 정리할까?",
              ),
            ).toBe(true);
            expect(new Set(claimIds).size).toBe(claimIds.length);
            expect(serialized).not.toContain("게으른 사람");
            expect(serialized).not.toContain("성실성이 낮");
          });
        });
      });
    });
  });

  it("builds the organizing-style code section from all 32 owner codes", () => {
    Object.entries(candidateProfileDefinitions).forEach(([code, profile]) => {
      const section = buildOrganizingStyleNuangCodeSection({
        code,
        scoresByScaleId: {
          adaptive_reset: 50,
          batch_reset: 25,
          stable_structure: 75,
          visible_capture: 100,
        },
      });
      const labeledList = section?.blocks?.find(
        (block) => block.kind === "labeled_list",
      );

      expect(section?.title).toContain(code);
      expect(section?.body).toContain(profile.displayName);
      expect(section?.claimIds).toHaveLength(5);
      if (!labeledList || labeledList.kind !== "labeled_list") {
        throw new Error(`Missing organizing-style code list for ${code}`);
      }
      expect(labeledList.items).toHaveLength(5);
      expect(labeledList.items.map((item) => item.label[0])).toEqual(
        code.split(""),
      );
    });
  });

  it("builds an exact score recipe and preserves scene-level variation", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const questions = getFreeTopicQuestions("comfort-style");
    const valuesByScale = {
      autonomy_pacing: [4, 4, 4, 3],
      collaborative_problem_solving: [5, 5, 4, 4],
      emotional_acknowledgement: [3, 3, 3, 3],
    };
    const cursorByScale: Record<string, number> = {};
    const answers = Object.fromEntries(
      questions.map((question) => {
        const scaleId = question.reportScaleId!;
        const cursor = cursorByScale[scaleId] ?? 0;
        cursorByScale[scaleId] = cursor + 1;
        return [
          question.id,
          {
            answeredAt: "2026-07-28T00:00:00.000Z",
            questionId: question.id,
            value: valuesByScale[scaleId as keyof typeof valuesByScale][
              cursor
            ] as FreeTopicAnswer["value"],
          },
        ];
      }),
    );
    const result = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: "2026-07-28T00:01:00.000Z",
    });
    const report = buildFreeTopicResultReport({ assessment, result });

    expect(result.scoresByScaleId).toEqual({
      autonomy_pacing: 69,
      collaborative_problem_solving: 88,
      emotional_acknowledgement: 50,
    });
    expect(Object.keys(result.scoresByQuestionId ?? {})).toHaveLength(12);
    expect(result.scaleStatisticsById?.emotional_acknowledgement).toMatchObject(
      {
        maxScore: 50,
        minScore: 50,
        responsePattern: "steady",
        scoreRange: 0,
      },
    );
    expect(report.personalizedSummary).toMatchObject({
      title: "방법은 같이 찾고, 속도는 내가 정하고 싶어요",
    });
    expect(report.personalizedSummary?.body).toContain(
      "막힌 문제는 함께 정리하되, 언제 말하고 어떤 도움을 받을지는 내가 고를 수 있을 때 편한 사람이에요",
    );
    expect(
      report.longReportSections.find(
        (section) => section.title === "장면별로 달랐던 부분",
      )?.claimIds,
    ).toHaveLength(12);
    expect(
      report.longReportSections.find(
        (section) => section.title === "나에게 필요한 위로 조합",
      )?.blocks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "labeled_list" }),
      ]),
    );
    expect(
      report.longReportSections.find(
        (section) => section.title === "사람에 따라 이렇게 말해 보세요",
      )?.blocks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ label: "가족" }),
            expect.objectContaining({ label: "친구" }),
            expect.objectContaining({ label: "연인" }),
            expect.objectContaining({ label: "업무" }),
          ]),
          kind: "labeled_list",
        }),
      ]),
    );
    expect(
      report.longReportSections.some(
        (section) => section.title === "이 결과를 계산한 방법",
      ),
    ).toBe(false);
  });

  it("distinguishes a steady midpoint from the same average made by opposite scene responses", () => {
    const steady = buildComfortResult([3, 3, 3, 3]);
    const varied = buildComfortResult([1, 1, 5, 5]);

    expect(
      steady.result.scaleStatisticsById?.emotional_acknowledgement,
    ).toMatchObject({
      meanScore: 50,
      responsePattern: "steady",
    });
    expect(
      varied.result.scaleStatisticsById?.emotional_acknowledgement,
    ).toMatchObject({
      meanScore: 50,
      responsePattern: "varied",
    });
    expect(steady.report.personalizedSummary?.body).not.toBe(
      varied.report.personalizedSummary?.body,
    );
    expect(
      steady.report.signals.find(
        (signal) => signal.areaLabel === "마음 알아주기",
      )?.label,
    ).toContain("어느 정도 필요했어요");
    expect(
      varied.report.signals.find(
        (signal) => signal.areaLabel === "마음 알아주기",
      )?.label,
    ).toContain("상황에 따라 달랐어요");
    expect(varied.report.personalizedSummary?.body).toContain(
      "마음 알아주기의 필요 정도는 힘들었던 일의 종류에 따라 달라졌어요",
    );
  });

  it("does not infer an opposite preference from a low helpfulness score", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const report = buildFreeTopicResultReport({
      assessment,
      result: {
        observations: [],
        scoresByScaleId: {
          autonomy_pacing: 0,
          collaborative_problem_solving: 0,
          emotional_acknowledgement: 0,
        },
        scoresByTargetId: {},
      },
    });
    const serialized = JSON.stringify(report);

    expect(serialized).toContain("반대 도움을 좋아한다는 뜻이 아니");
    expect(serialized).not.toContain("혼자 해결하는 편을 좋아해요");
    expect(serialized).not.toContain("감정 대화를 싫어해요");
  });

  it("builds a complete, code-specific comfort section for all 32 Nuang codes", () => {
    const codes = Object.keys(candidateProfileDefinitions);
    const scenarios = [
      [50, 50, 50],
      [100, 100, 100],
      [0, 0, 0],
      [100, 0, 0],
      [0, 100, 0],
      [0, 0, 100],
      [50, 88, 69],
    ] as const;

    expect(codes).toHaveLength(32);

    codes.forEach((code) => {
      const profile = candidateProfileDefinitions[code];

      scenarios.forEach(([emotional, problem, autonomy]) => {
        const section = buildComfortStyleNuangCodeSection({
          code,
          scoresByScaleId: {
            autonomy_pacing: autonomy,
            collaborative_problem_solving: problem,
            emotional_acknowledgement: emotional,
          },
        });
        const labeledList = section?.blocks?.find(
          (block) => block.kind === "labeled_list",
        );

        expect(section?.title).toBe(
          `검사를 마쳤을 때의 뉴앙 코드 ${code}로 함께 보면`,
        );
        expect(section?.body).toContain(profile.displayName);
        expect(section?.body).toContain(profile.summary);
        expect(section?.claimIds).toHaveLength(5);
        expect(new Set(section?.claimIds).size).toBe(5);
        expect(labeledList?.kind).toBe("labeled_list");

        if (!labeledList || labeledList.kind !== "labeled_list") {
          throw new Error(`Missing five-axis list for ${code}`);
        }

        expect(labeledList.items).toHaveLength(5);
        expect(labeledList.items.map((item) => item.label[0])).toEqual(
          code.split(""),
        );
        expect(section?.body).not.toContain("위로가 필요하지 않");
        expect(section?.body).not.toContain("정신건강");
        expect(section?.body).not.toContain("애착유형");
        expect(section?.body).not.toMatch(
          /(마음 알아주기|방법 함께 찾기|확인된 도움)’을/,
        );
        expect(section?.body).not.toContain("이번 위로 검사 결과를 바꾸지");
      });
    });

    expect(
      buildComfortStyleNuangCodeSection({
        code: "ABCDE",
        scoresByScaleId: {},
      }),
    ).toBeNull();
  });

  it.each([
    [0, "전혀 필요하지 않았어요"],
    [12, "전혀 필요하지 않았어요"],
    [13, "별로 필요하지 않았어요"],
    [37, "별로 필요하지 않았어요"],
    [38, "어느 정도 필요했어요"],
    [62, "어느 정도 필요했어요"],
    [63, "꽤 필요했어요"],
    [87, "꽤 필요했어요"],
    [88, "매우 필요했어요"],
    [100, "매우 필요했어요"],
  ])(
    "uses response-aligned wording at the %i-point boundary",
    (score, label) => {
      const assessment = getFreeTopicAssessment("comfort-style")!;
      const report = buildFreeTopicResultReport({
        assessment,
        result: {
          observations: [],
          scoresByScaleId: {
            autonomy_pacing: 50,
            collaborative_problem_solving: 50,
            emotional_acknowledgement: score,
          },
          scoresByTargetId: {},
        },
      });

      expect(
        report.signals.find((signal) => signal.areaLabel === "마음 알아주기")
          ?.levelLabel,
      ).toBe(label);
    },
  );

  it("gives distinct summaries when every support is high or every support is low", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const buildSummaryAt = (score: number) =>
      buildFreeTopicResultReport({
        assessment,
        result: {
          observations: [],
          scoresByScaleId: {
            autonomy_pacing: score,
            collaborative_problem_solving: score,
            emotional_acknowledgement: score,
          },
          scoresByTargetId: {},
        },
      }).personalizedSummary?.title;

    expect(buildSummaryAt(100)).toBe(
      "마음도 알아주고, 방법과 속도도 함께 맞춰주길 바라요",
    );
    expect(buildSummaryAt(0)).toBe(
      "힘들 때 누군가의 도움을 크게 필요로 하지 않는 편이에요",
    );
  });

  it("does not invent a partial comparison when fewer than three common scenes are complete", () => {
    const assessment = getFreeTopicAssessment("comfort-style")!;
    const report = buildFreeTopicResultReport({
      assessment,
      result: {
        observations: [],
        scoresByScaleId: {},
        scoresByTargetId: {},
        validResponsesByScaleId: {
          autonomy_pacing: 2,
          collaborative_problem_solving: 2,
          emotional_acknowledgement: 2,
        },
      },
    });

    expect(report.signals).toHaveLength(0);
    expect(report.longReportSections).toEqual([]);
  });
});

function buildComfortResult(emotionalValues: Array<1 | 2 | 3 | 4 | 5>) {
  const assessment = getFreeTopicAssessment("comfort-style")!;
  const questions = getFreeTopicQuestions("comfort-style");
  let emotionalCursor = 0;
  const answers = Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        answeredAt: "2026-07-28T00:00:00.000Z",
        questionId: question.id,
        value:
          question.reportScaleId === "emotional_acknowledgement"
            ? emotionalValues[emotionalCursor++]
            : 3,
      } satisfies FreeTopicAnswer,
    ]),
  );
  const result = calculateFreeTopicResult({
    answers,
    assessment,
    observedAt: "2026-07-28T00:01:00.000Z",
  });

  return {
    report: buildFreeTopicResultReport({ assessment, result }),
    result,
  };
}
