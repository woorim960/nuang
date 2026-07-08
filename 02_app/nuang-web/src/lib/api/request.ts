import { NextResponse } from "next/server";
import { z } from "zod";

export async function readValidatedJson<T>(request: Request, schema: z.ZodType<T>) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "invalid_json",
          message: "Request body must be valid JSON.",
        },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "validation_error",
          issues: parsed.error.issues.map((issue) => ({
            code: issue.code,
            message: issue.message,
            path: issue.path,
          })),
        },
        { status: 422 },
      ),
    };
  }

  return {
    data: parsed.data,
    ok: true as const,
  };
}
