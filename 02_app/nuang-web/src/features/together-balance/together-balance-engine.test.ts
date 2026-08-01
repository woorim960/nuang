import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_BALANCE_PACKS,
  getBalanceResultLabel,
  getBalanceScoreBand,
  getDisplayedBalanceOptions,
  getPublicBalancePack,
  scoreBalanceGroup,
  scoreBalancePair,
  scoreBalanceReciprocalPair,
  selectBalancePairHighlights,
  selectBalanceQuestionSet,
  stableBalanceHash,
  validateBalancePack,
} from "./index";
import type { BalancePack, BalanceQuestion, BalanceResponse } from "./types";

function responsesFor(
  pack: BalancePack,
  participantId: string,
  count: number,
  matchingPrefix = count,
) {
  return pack.questions
    .slice(0, count)
    .map<BalanceResponse>((question, index) => ({
      participantId,
      itemId: question.id,
      optionId:
        index < matchingPrefix
          ? question.options[0].id
          : question.options[1].id,
      clientSequence: index + 1,
    }));
}

function reciprocalQuestion(
  packId: string,
  meaningCode: string,
  role: "preference" | "self_behavior",
): BalanceQuestion {
  return {
    id: `${packId}:${meaningCode}:${role}`,
    packId,
    prompt: `${meaningCode} ${role}`,
    options: [
      { id: `${meaningCode}:a`, text: "A 방식" },
      { id: `${meaningCode}:b`, text: "B 방식" },
    ],
    subtopic: meaningCode,
    promptRole: role,
    meaningCode,
    phase: "conversation",
    intensity: "deep",
    audience: "couple",
    sensitivity: "private",
    scored: true,
    highlightPriority: 3,
    conversationValue: 3,
    contentVersion: 1,
  };
}

function reciprocalFixture(): BalancePack {
  const id = "reciprocal-fixture";
  const axes = ["date", "comfort", "contact", "conflict"];
  return {
    id,
    slug: id,
    title: "우리 둘의 케미",
    description: "테스트 팩",
    scoringTemplate: "reciprocal_fit",
    resultSemantics: "reciprocal_fit",
    defaultQuestionCount: 8,
    supportedQuestionCounts: [8],
    roundSize: 8,
    contentPoolVersion: 1,
    questions: axes.flatMap((axis) => [
      reciprocalQuestion(id, axis, "preference"),
      reciprocalQuestion(id, axis, "self_behavior"),
    ]),
  };
}

describe("public balance content", () => {
  it("ships the eight launch packs with the planned names and usable pools", () => {
    expect(PUBLIC_BALANCE_PACKS.map((pack) => pack.title)).toEqual([
      "취향 종합전",
      "우리 어디갈까?",
      "우리 뭐 먹을까?",
      "우리 뭐할까?",
      "우리 뭐 볼까?",
      "끌리는 사람",
      "평생 하나만?",
      "웃긴 극한 선택",
    ]);
    expect(PUBLIC_BALANCE_PACKS).toHaveLength(8);

    for (const pack of PUBLIC_BALANCE_PACKS) {
      expect(new Set(pack.questions.map((question) => question.id)).size).toBe(
        pack.questions.length,
      );
      expect(
        new Set(pack.questions.map((question) => question.prompt)).size,
      ).toBe(pack.questions.length);
      expect(validateBalancePack(pack)).toEqual([]);
    }
  });

  it("ships all 312 approved launch questions at the per-pack targets", () => {
    expect(
      Object.fromEntries(
        PUBLIC_BALANCE_PACKS.map((pack) => [pack.slug, pack.questions.length]),
      ),
    ).toEqual({
      "mixed-taste": 32,
      "where-to-go": 40,
      "what-to-eat": 48,
      "what-to-do": 40,
      "what-to-watch": 32,
      "ideal-person": 32,
      "forever-one": 40,
      "funny-extreme": 48,
    });
    expect(
      PUBLIC_BALANCE_PACKS.reduce(
        (total, pack) => total + pack.questions.length,
        0,
      ),
    ).toBe(312);
    expect(PUBLIC_BALANCE_PACKS[0].questions.at(-1)?.id).toBe(
      "mixed-taste_032",
    );
  });

  it("pins every immutable public content pool to its reviewed fingerprint", () => {
    const fingerprints = Object.fromEntries(
      PUBLIC_BALANCE_PACKS.map((pack) => {
        const canonicalContent = JSON.stringify({
          version: pack.contentPoolVersion,
          questions: pack.questions.map((question) => [
            question.id,
            question.prompt,
            question.options.map((option) => [option.id, option.text]),
            question.subtopic,
            question.phase,
            question.contentVersion,
          ]),
        });
        return [
          pack.slug,
          {
            version: pack.contentPoolVersion,
            fingerprint: stableBalanceHash(canonicalContent)
              .toString(16)
              .padStart(8, "0"),
          },
        ];
      }),
    );

    expect(fingerprints).toEqual({
      "mixed-taste": { version: 1, fingerprint: "308c3415" },
      "where-to-go": { version: 1, fingerprint: "91ddfba6" },
      "what-to-eat": { version: 1, fingerprint: "11b5edeb" },
      "what-to-do": { version: 1, fingerprint: "2c7f5930" },
      "what-to-watch": { version: 1, fingerprint: "7eea56f5" },
      "ideal-person": { version: 1, fingerprint: "b79f3ac4" },
      "forever-one": { version: 1, fingerprint: "f090ea0f" },
      "funny-extreme": { version: 2, fingerprint: "2ecfe112" },
    });
    expect(
      getPublicBalancePack("funny-extreme")?.questions.every(
        (question) => question.contentVersion === 2,
      ),
    ).toBe(true);
  });

  it("keeps every catalog representative row identical to the canonical registry", () => {
    const catalog = readFileSync(
      "docs/NUANG_TOGETHER_BALANCE_GAME_CONTENT_CATALOG.md",
      "utf8",
    );
    const sections = [
      [3, 4, "mixed-taste"],
      [4, 5, "where-to-go"],
      [5, 6, "what-to-eat"],
      [6, 7, "what-to-do"],
      [7, 8, "what-to-watch"],
      [8, 9, "ideal-person"],
      [9, 10, "forever-one"],
      [10, 11, "funny-extreme"],
    ] as const;

    for (const [sectionNumber, nextSectionNumber, slug] of sections) {
      const start = catalog.indexOf(`## ${sectionNumber}.`);
      const end = catalog.indexOf(`## ${nextSectionNumber}.`, start);
      const rows = catalog
        .slice(start, end)
        .split("\n")
        .filter((line) => line.startsWith("|"))
        .slice(2)
        .map((line) =>
          line
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim()),
        )
        .filter((row) => row.length === 4);
      const pack = getPublicBalancePack(slug)!;
      const canonicalRows = new Set(
        pack.questions.map((question) =>
          JSON.stringify([
            question.prompt,
            question.options[0].text,
            question.options[1].text,
            question.subtopic,
          ]),
        ),
      );
      const missingRows = rows.filter(
        (row) => !canonicalRows.has(JSON.stringify(row)),
      );

      expect(missingRows, `${slug} representative rows`).toEqual([]);
    }
  });

  it("detects repeated prompts, repeated option pairs, and long mobile copy", () => {
    const source = PUBLIC_BALANCE_PACKS[0];
    const first = source.questions[0];
    const second = source.questions[1];
    const invalid: BalancePack = {
      ...source,
      questions: [
        first,
        {
          ...second,
          prompt: `${first.prompt.replace(/\?$/, "")} ?`,
          options: [
            { ...second.options[0], text: first.options[1].text },
            { ...second.options[1], text: first.options[0].text },
          ],
        },
        {
          ...source.questions[2],
          id: "mobile-copy-fixture",
          prompt:
            "아주 긴 상황을 모바일 한 화면에 억지로 모두 넣어서 선택지를 읽기도 전에 피로하게 만드는 문장이라면 무엇을 고를지 생각해 본다면?",
          options: [
            {
              id: "mobile-copy-fixture:a",
              text: "선택지 카드 한 줄을 훨씬 넘어서 여러 줄을 가득 채우는 지나치게 긴 첫 번째 답",
            },
            { id: "mobile-copy-fixture:b", text: "짧은 답" },
          ],
        },
      ],
    };
    const codes = validateBalancePack(invalid).map((issue) => issue.code);

    expect(codes).toContain("duplicate_prompt");
    expect(codes).toContain("duplicate_option_pair");
    expect(codes).toContain("prompt_too_long");
    expect(codes).toContain("option_too_long");
  });

  it("keeps ideal preference and fun dilemma meanings separate", () => {
    expect(getPublicBalancePack("ideal-person")?.scoringTemplate).toBe(
      "ideal_preference",
    );
    expect(getPublicBalancePack("forever-one")?.scoringTemplate).toBe(
      "dilemma_fun",
    );
    expect(getBalanceResultLabel("ideal_preference_similarity")).toBe(
      "이상형 취향 닮음도",
    );
    expect(getBalanceResultLabel("choice_chemistry")).toBe("선택 케미");
  });
});

describe("deterministic question selection", () => {
  const pack = getPublicBalancePack("what-to-eat")!;

  it.each([8, 16, 20, 24] as const)(
    "supports %i questions split at eight-question result moments",
    (questionCount) => {
      const set = selectBalanceQuestionSet({
        pack,
        questionCount,
        roomQuestionSeed: "room-2026-07-31",
      });
      const ids = set.rounds.flatMap((round) =>
        round.questions.map((item) => item.question.id),
      );

      expect(ids).toHaveLength(questionCount);
      expect(new Set(ids).size).toBe(questionCount);
      expect(set.rounds.every((round) => round.questions.length <= 8)).toBe(
        true,
      );
      expect(
        set.rounds.slice(0, -1).every((round) => round.questions.length === 8),
      ).toBe(true);
    },
  );

  it("returns the same version, order, and hash for every room participant", () => {
    const request = {
      pack,
      questionCount: 16 as const,
      roomQuestionSeed: "same-room-seed",
      groupId: "friends",
      participantIds: ["a", "b"],
    };
    const first = selectBalanceQuestionSet(request);
    const second = selectBalanceQuestionSet(request);

    expect(second).toEqual(first);
    expect(second.questionSetHash).toBe(first.questionSetHash);
  });

  it("prioritizes unseen questions and stays below the recent repeat gate", () => {
    const recentlySeen = pack.questions.slice(0, 8);
    const set = selectBalanceQuestionSet({
      pack,
      questionCount: 16,
      roomQuestionSeed: "fresh-first",
      groupId: "friends",
      participantIds: ["a", "b"],
      now: "2026-07-31T00:00:00.000Z",
      exposures: recentlySeen.map((question) => ({
        itemId: question.id,
        groupId: "friends",
        participantId: "a",
        seenAt: "2026-07-01T00:00:00.000Z",
      })),
    });

    expect(set.repeatRatio).toBeLessThanOrEqual(0.2);
    expect(set.disclosure).toBeNull();
  });

  it("does not reintroduce repeats only to fill a phase quota", () => {
    const mixedPack = getPublicBalancePack("mixed-taste")!;
    const familiarQuestions = mixedPack.questions.filter(
      (question) => question.phase === "familiar",
    );
    const set = selectBalanceQuestionSet({
      pack: mixedPack,
      questionCount: 8,
      roomQuestionSeed: "freshness-before-phase",
      groupId: "friends",
      participantIds: ["a"],
      now: "2026-07-31T00:00:00.000Z",
      exposures: familiarQuestions.map((question) => ({
        itemId: question.id,
        groupId: "friends",
        participantId: "a",
        seenAt: "2026-07-30T00:00:00.000Z",
      })),
    });

    expect(set.repeatedQuestionCount).toBe(0);
    expect(set.repeatRatio).toBe(0);
    expect(set.disclosure).toBeNull();
  });

  it("reports the exact fresh/repeated mix when the pool is exhausted", () => {
    const set = selectBalanceQuestionSet({
      pack,
      questionCount: 24,
      roomQuestionSeed: "exhausted",
      groupId: "friends",
      now: "2026-07-31T00:00:00.000Z",
      exposures: pack.questions.map((question) => ({
        itemId: question.id,
        groupId: "friends",
        seenAt: "2026-07-30T00:00:00.000Z",
      })),
    });

    expect(set).toMatchObject({
      freshQuestionCount: 0,
      repeatedQuestionCount: 24,
      repeatRatio: 1,
      disclosure: "새 질문 0개 + 다시 만나는 질문 24개",
    });
  });

  it("counts a participant's recent questions as repeats across different rooms", () => {
    const set = selectBalanceQuestionSet({
      pack,
      questionCount: 16,
      roomQuestionSeed: "new-room-same-person",
      groupId: "new-friends",
      participantIds: ["a"],
      now: "2026-07-31T00:00:00.000Z",
      exposures: pack.questions.map((question) => ({
        itemId: question.id,
        groupId: "old-friends",
        participantId: "a",
        seenAt: "2026-07-30T00:00:00.000Z",
      })),
    });

    expect(set).toMatchObject({
      freshQuestionCount: 0,
      repeatedQuestionCount: 16,
      repeatRatio: 1,
      disclosure: "새 질문 0개 + 다시 만나는 질문 16개",
    });
  });

  it("always includes the three planned conversation phases", () => {
    for (const publicPack of PUBLIC_BALANCE_PACKS) {
      for (const seed of ["phase-1", "phase-2", "phase-3", "phase-4"]) {
        const set = selectBalanceQuestionSet({
          pack: publicPack,
          questionCount: 12,
          roomQuestionSeed: `${publicPack.id}:${seed}`,
        });
        const phaseCounts = set.rounds
          .flatMap((round) => round.questions)
          .reduce(
            (counts, item) => {
              counts[item.question.phase] += 1;
              return counts;
            },
            { familiar: 0, everyday: 0, conversation: 0 },
          );

        expect(phaseCounts).toEqual({
          familiar: 4,
          everyday: 4,
          conversation: 4,
        });
      }
    }
  });

  it("randomizes only presentation positions while keeping option ids stable", () => {
    const question = pack.questions[0];
    const displayed = getDisplayedBalanceOptions(question, "room", "member");

    expect(new Set(displayed.map((option) => option.id))).toEqual(
      new Set(question.options.map((option) => option.id)),
    );
    expect(displayed.map((option) => option.position)).toEqual([
      "left",
      "right",
    ]);
    expect(getDisplayedBalanceOptions(question, "room", "member")).toEqual(
      displayed,
    );
  });

  it("keeps reciprocal meaning pairs inside the same eight-item round", () => {
    const set = selectBalanceQuestionSet({
      pack: reciprocalFixture(),
      questionCount: 8,
      roomQuestionSeed: "reciprocal-room",
    });
    const questions = set.rounds[0].questions.map((item) => item.question);

    expect(questions).toHaveLength(8);
    for (const meaningCode of ["date", "comfort", "contact", "conflict"]) {
      const indexes = questions.flatMap((question, index) =>
        question.meaningCode === meaningCode ? [index] : [],
      );
      expect(indexes).toHaveLength(2);
      expect(Math.abs(indexes[0] - indexes[1])).toBeGreaterThan(1);
    }
  });
});

describe("option-id scoring", () => {
  const pack = getPublicBalancePack("mixed-taste")!;

  it.each([
    [8, 8, 100],
    [16, 12, 75],
    [20, 10, 50],
    [24, 18, 75],
    [8, 0, 0],
  ] as const)(
    "scores %i questions with %i matches as %i",
    (count, matches, expected) => {
      const participantA = responsesFor(pack, "a", count, count);
      const participantB = responsesFor(pack, "b", count, matches);
      const score = scoreBalancePair(
        pack,
        "a",
        participantA,
        "b",
        participantB,
      );

      expect(score).toMatchObject({
        matchCount: matches,
        comparedCount: count,
        roundedScore: expected,
      });
    },
  );

  it("ignores unanswered items and duplicate retry submissions", () => {
    const question = pack.questions[0];
    const participantA: BalanceResponse[] = [
      {
        participantId: "a",
        itemId: question.id,
        optionId: question.options[1].id,
        clientSequence: 1,
      },
      {
        participantId: "a",
        itemId: question.id,
        optionId: question.options[0].id,
        clientSequence: 2,
      },
    ];
    const participantB: BalanceResponse[] = [
      {
        participantId: "b",
        itemId: question.id,
        optionId: question.options[0].id,
      },
    ];

    expect(
      scoreBalancePair(pack, "a", participantA, "b", participantB),
    ).toMatchObject({
      matchCount: 1,
      comparedCount: 1,
      roundedScore: 100,
    });
  });

  it("is symmetric and averages raw pair scores for the group", () => {
    const a = responsesFor(pack, "a", 8, 8);
    const b = responsesFor(pack, "b", 8, 4);
    const c = pack.questions.slice(0, 8).map<BalanceResponse>((question) => ({
      participantId: "c",
      itemId: question.id,
      optionId: question.options[1].id,
    }));
    const ab = scoreBalancePair(pack, "a", a, "b", b);
    const ba = scoreBalancePair(pack, "b", b, "a", a);
    const group = scoreBalanceGroup(pack, [
      { id: "c", responses: c },
      { id: "a", responses: a },
      { id: "b", responses: b },
    ]);

    expect(ba.rawScore).toBe(ab.rawScore);
    expect(group.pairCount).toBe(3);
    expect(group.rawScore).toBe(
      group.pairs.reduce((sum, pair) => sum + pair.rawScore!, 0) / 3,
    );
    expect(
      scoreBalanceGroup(pack, [
        { id: "a", responses: a },
        { id: "b", responses: b },
        { id: "c", responses: c },
      ]).rawScore,
    ).toBe(group.rawScore);
  });

  it("selects diverse highlights and uses non-judgmental score bands", () => {
    const a = responsesFor(pack, "a", 16, 16);
    const b = responsesFor(pack, "b", 16, 8);
    const differences = selectBalancePairHighlights(
      pack,
      "a",
      a,
      "b",
      b,
      "difference",
    );

    expect(differences).toHaveLength(3);
    expect(new Set(differences.map((item) => item.subtopic)).size).toBe(3);
    expect(getBalanceScoreBand(50).title).toBe("반반 케미");
    expect(getBalanceScoreBand(5).title).toBe("극과 극 케미");
  });

  it("labels ideal answers as shared ideal taste, not couple compatibility", () => {
    const idealPack = getPublicBalancePack("ideal-person")!;
    const a = responsesFor(idealPack, "a", 8, 8);
    const b = responsesFor(idealPack, "b", 8, 8);
    const result = scoreBalancePair(idealPack, "a", a, "b", b);

    expect(result.semantics).toBe("ideal_preference_similarity");
    expect(result.roundedScore).toBe(100);
    expect(getBalanceResultLabel(result.semantics)).toBe("이상형 취향 닮음도");
  });

  it("crosses each person's preference with the other's self behavior", () => {
    const reciprocal = reciprocalFixture();
    const answer = (
      participantId: string,
      question: BalanceQuestion,
      option: 0 | 1,
    ): BalanceResponse => ({
      participantId,
      itemId: question.id,
      optionId: question.options[option].id,
    });
    const a: BalanceResponse[] = [];
    const b: BalanceResponse[] = [];

    for (const question of reciprocal.questions) {
      a.push(
        answer("a", question, question.promptRole === "preference" ? 0 : 1),
      );
      b.push(
        answer("b", question, question.promptRole === "preference" ? 1 : 0),
      );
    }
    const result = scoreBalanceReciprocalPair(reciprocal, "a", a, "b", b);

    expect(result.fromAToB).toMatchObject({
      matchCount: 4,
      comparedCount: 4,
      roundedScore: 100,
    });
    expect(result.fromBToA).toMatchObject({
      matchCount: 4,
      comparedCount: 4,
      roundedScore: 100,
    });
    expect(result.roundedScore).toBe(100);
  });
});
