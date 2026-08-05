import { NextResponse } from "next/server";
import { z } from "zod";

export const DEFAULT_JSON_BODY_MAX_BYTES = 512 * 1024;

export async function readValidatedJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  { maxBytes = DEFAULT_JSON_BODY_MAX_BYTES }: { maxBytes?: number } = {},
) {
  let body: unknown;

  try {
    const rawBody = await readBodyWithinLimit(request, maxBytes);
    body = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error: "request_body_too_large",
            message: `Request body must be ${maxBytes} bytes or smaller.`,
          },
          { status: 413 },
        ),
      };
    }

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

async function readBodyWithinLimit(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

class RequestBodyTooLargeError extends Error {}
