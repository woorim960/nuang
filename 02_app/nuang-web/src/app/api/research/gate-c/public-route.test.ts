import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as startSession } from "@/app/api/research/gate-c/sessions/route";
import { POST as completeSession } from "@/app/api/research/gate-c/sessions/[sessionId]/complete/route";
import { gateCPublicConsentVersion } from "@/features/research/gate-c/gate-c-public-contract";
import { gateCParticipantDefinitions } from "@/features/research/gate-c/gate-c-study-fixture";

const routeMocks = vi.hoisted(() => ({
  refreshAnalysis: vi.fn(async () => ({})),
  serviceClient: null as unknown,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => routeMocks.serviceClient),
}));

vi.mock("@/features/research/gate-c/gate-c-auto-analysis", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/research/gate-c/gate-c-auto-analysis")
  >("@/features/research/gate-c/gate-c-auto-analysis");
  return { ...actual, refreshGateCAnalysis: routeMocks.refreshAnalysis };
});

describe("Gate C public research API", () => {
  beforeEach(() => {
    process.env.SHARE_TOKEN_PEPPER = "test-gate-c-pepper";
  });

  afterEach(() => {
    routeMocks.serviceClient = null;
    vi.clearAllMocks();
  });

  it("creates an automatically assigned pseudonymous session without a name", async () => {
    const captured: { insert: null | Record<string, unknown> } = {
      insert: null,
    };
    routeMocks.serviceClient = createStartClient(captured);

    const response = await startSession(
      jsonRequest("http://localhost/api/research/gate-c/sessions", {
        ageBand: "25_29",
        assessmentExperience: "sometimes",
        consentAccepted: true,
        consentVersion: gateCPublicConsentVersion,
        isAdult: true,
        lifeContext: "employed",
        name: "서버에 저장되면 안 되는 값",
        website: "",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      formId: expect.stringMatching(/^FORM_[A-E]$/),
      participantCode: expect.stringMatching(/^GC-[A-F0-9]{8}$/),
    });
    expect(captured.insert).toMatchObject({
      age_band: "25_29",
      assessment_experience: "sometimes",
      life_context: "employed",
    });
    expect(captured.insert).not.toHaveProperty("name");
    expect(captured.insert).not.toHaveProperty("email");
    expect(captured.insert).not.toHaveProperty("ip_address");
  });

  it("atomically stores the exact assigned 12-item set and refreshes analysis", async () => {
    const captured: { rpc: null | Record<string, unknown> } = { rpc: null };
    routeMocks.serviceClient = createCompletionClient(captured);
    const definition = gateCParticipantDefinitions.FORM_A;
    const responses = definition.items.map((item) => ({
      changeCount: 0,
      confusionFlag: false,
      confusionNote: "",
      finalChoice: { kind: "scale", value: 3 },
      firstAnswerElapsedMs: 2500,
      firstChoice: { kind: "scale", value: 3 },
      orderIndex: item.orderIndex,
      responseChanged: false,
      studyItemId: item.studyItemId,
      unsureReason: null,
    }));

    const response = await completeSession(
      jsonRequest(
        "http://localhost/api/research/gate-c/sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/complete",
        {
          clientDurationMs: 80_000,
          responses,
          sessionToken: "a-session-token-that-is-long-enough",
        },
      ),
      {
        params: Promise.resolve({
          sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      analysisStatus: "refreshed",
      ok: true,
      qualityStatus: "included",
    });
    expect(captured.rpc).toMatchObject({
      supplied_client_duration_ms: 80_000,
      supplied_quality_status: "included",
      supplied_responses: responses,
      target_session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(routeMocks.refreshAnalysis).toHaveBeenCalledTimes(1);
  });

  it("rejects a submission whose items do not match the server-assigned form", async () => {
    const captured: { rpc: null | Record<string, unknown> } = { rpc: null };
    routeMocks.serviceClient = createCompletionClient(captured);
    const responses = gateCParticipantDefinitions.FORM_B.items.map((item) => ({
      changeCount: 0,
      confusionFlag: false,
      confusionNote: "",
      finalChoice: { kind: "scale", value: 3 },
      firstAnswerElapsedMs: 2500,
      firstChoice: { kind: "scale", value: 3 },
      orderIndex: item.orderIndex,
      responseChanged: false,
      studyItemId: item.studyItemId,
      unsureReason: null,
    }));

    const response = await completeSession(
      jsonRequest(
        "http://localhost/api/research/gate-c/sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/complete",
        {
          clientDurationMs: 80_000,
          responses,
          sessionToken: "a-session-token-that-is-long-enough",
        },
      ),
      {
        params: Promise.resolve({
          sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      },
    );

    expect(response.status).toBe(422);
    expect(captured.rpc).toBeNull();
  });
});

function createStartClient(captured: {
  insert: null | Record<string, unknown>;
}) {
  const assignmentBuilder = {
    eq: () => assignmentBuilder,
    limit: async () => ({ data: [], error: null }),
  };
  return {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        captured.insert = row;
        return { error: null };
      },
      select: () => assignmentBuilder,
    }),
  };
}

function createCompletionClient(captured: {
  rpc: null | Record<string, unknown>;
}) {
  const sessionBuilder = {
    eq: () => sessionBuilder,
    maybeSingle: async () => ({
      data: {
        form_id: "FORM_A",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        status: "started",
      },
      error: null,
    }),
  };
  return {
    from: () => ({ select: () => sessionBuilder }),
    rpc: async (_name: string, args: Record<string, unknown>) => {
      captured.rpc = args;
      return {
        data: [
          {
            participant_code: "GC-12345678",
            public_receipt_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          },
        ],
        error: null,
      };
    },
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
  });
}
