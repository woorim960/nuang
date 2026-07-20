import { feedWriteRequestSchema } from "@/features/feed/feed-contract";
import { validateFeedPhotoFiles } from "@/features/feed/feed-media";
import { uploadFeedPostMedia } from "@/features/feed/feed-media-server";
import { createServerFeedReadPayload } from "@/features/feed/server-read";
import {
  createFeedWriteFailurePayload,
  createFeedWriteSuccessPayload,
  feedWriteFailures,
} from "@/features/feed/feed-write-contract";
import { writeFeedRequestForAccount } from "@/features/feed/server-writes";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { readValidatedJson } from "@/lib/api/request";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  return Response.json({
    ok: true,
    result: await createServerFeedReadPayload(),
  });
}

export async function POST(request: Request) {
  const payload = await readFeedWriteRequest(request);

  if (!payload.ok) {
    return payload.response;
  }

  const auth = await requireAuthenticatedUser();

  if (!auth.ok) {
    return auth.response;
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return createApiClosedResponse("supabase_env_missing");
  }

  const result = await writeFeedRequestForAccount({
    client: serviceClient,
    payload: payload.data,
    user: auth.user,
  });

  if (!result.ok) {
    return NextResponse.json(createFeedWriteFailurePayload(result.code), {
      status: feedWriteFailures[result.code].httpStatus,
    });
  }

  if (payload.files.length > 0 && payload.data.action === "create_post") {
    const mediaResult = await uploadFeedPostMedia({
      client: serviceClient,
      files: payload.files,
      postId: result.data.id,
      user: auth.user,
    });

    if (!mediaResult.ok) {
      return NextResponse.json(
        createFeedWriteFailurePayload(mediaResult.code),
        {
          status: feedWriteFailures[mediaResult.code].httpStatus,
        },
      );
    }
  }

  return NextResponse.json(createFeedWriteSuccessPayload(result.data));
}

async function readFeedWriteRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const payload = await readValidatedJson(request, feedWriteRequestSchema);

    return payload.ok ? { ...payload, files: [] as File[] } : payload;
  }

  try {
    const formData = await request.formData();
    const rawPayload = formData.get("payload");
    const files = formData
      .getAll("media")
      .filter((value): value is File => value instanceof File);

    if (typeof rawPayload !== "string") {
      return invalidFeedRequest("게시물 내용을 확인하지 못했어요.");
    }

    const parsedJson = JSON.parse(rawPayload) as unknown;
    const parsedPayload = feedWriteRequestSchema.safeParse(parsedJson);

    if (!parsedPayload.success) {
      return invalidFeedRequest("게시물 내용을 다시 확인해 주세요.");
    }

    if (files.length > 0 && parsedPayload.data.action !== "create_post") {
      return invalidFeedRequest("사진을 추가할 게시물을 확인하지 못했어요.");
    }

    const photoError = validateFeedPhotoFiles(files);

    if (photoError) {
      return invalidFeedRequest(photoError);
    }

    return {
      data: parsedPayload.data,
      files,
      ok: true as const,
    };
  } catch {
    return invalidFeedRequest("게시물 내용을 읽지 못했어요.");
  }
}

function invalidFeedRequest(message: string) {
  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: "invalid_request",
        message,
        ok: false,
      },
      { status: 400 },
    ),
  };
}
