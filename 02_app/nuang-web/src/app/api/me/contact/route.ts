import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAccountForUser } from "@/features/account/server-writes";
import {
  deletePrivateEmail,
  deletePrivateMobilePhone,
  readPrivateContact,
  readPrivateContactMarketingPreference,
  savePrivateEmail,
  savePrivateMobilePhone,
  savePrivateContactMarketingPreference,
  toPrivateContactPayload,
} from "@/features/account/server-private-contact";
import { privateContactWriteSchema } from "@/features/account/private-contact-contract";
import { requireAuthenticatedUser } from "@/features/auth/server-auth";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";
import { createApiClosedResponse } from "@/lib/api/closed-state";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const deleteSchema = z.object({
  cancelActiveEntries: z.boolean().default(false),
  field: z.enum(["email", "mobile_phone"]).default("mobile_phone"),
});

export async function GET() {
  const context = await getContactContext();
  if (!context.ok) return context.response;

  const [contact, marketingPreference] = await Promise.all([
    readPrivateContact({
      accountId: context.accountId,
      client: context.client,
    }),
    readPrivateContactMarketingPreference({
      accountId: context.accountId,
      client: context.client,
    }),
  ]);
  if (!contact.ok || !marketingPreference.ok) {
    return contactFailure(
      "contact_read_failed",
      "연락처를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  return contactSuccess(
    toPrivateContactPayload(contact.data, marketingPreference.data),
  );
}

export async function PATCH(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return contactFailure(
      "cross_site_request",
      "요청을 확인하지 못했어요.",
      403,
    );
  }

  const parsed = privateContactWriteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return contactFailure(
      "contact_invalid",
      "입력한 연락처를 다시 확인해 주세요.",
      422,
    );
  }

  const context = await getContactContext();
  if (!context.ok) return context.response;

  if ("preference" in parsed.data) {
    const [contact, marketingPreference] = await Promise.all([
      readPrivateContact({
        accountId: context.accountId,
        client: context.client,
      }),
      savePrivateContactMarketingPreference({
        accountId: context.accountId,
        client: context.client,
        marketingOptIn: parsed.data.marketingOptIn,
      }),
    ]);
    if (!contact.ok || !marketingPreference.ok) {
      return contactFailure(
        "marketing_preference_write_failed",
        "광고성 소식 설정을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
      );
    }
    return contactSuccess(
      toPrivateContactPayload(contact.data, marketingPreference.data),
    );
  }

  const saved =
    "email" in parsed.data
      ? await savePrivateEmail({
          accountId: context.accountId,
          client: context.client,
          email: parsed.data.email,
          source: parsed.data.source,
        })
      : await savePrivateMobilePhone({
          accountId: context.accountId,
          client: context.client,
          mobilePhone: parsed.data.mobilePhone,
          source: parsed.data.source,
        });

  if (!saved.ok) {
    if (saved.code === "email_in_use") {
      return contactFailure(
        "contact_unavailable",
        "이 연락처는 지금 저장할 수 없어요. 입력한 내용을 다시 확인해 주세요.",
        409,
      );
    }
    if (saved.code === "mobile_phone_in_use") {
      return contactFailure(
        "contact_unavailable",
        "이 연락처는 지금 저장할 수 없어요. 입력한 내용을 다시 확인해 주세요.",
        409,
      );
    }
    return contactFailure(
      saved.code,
      "연락처를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  let marketingOptIn = false;
  if (typeof parsed.data.marketingOptIn === "boolean") {
    const marketingPreference = await savePrivateContactMarketingPreference({
      accountId: context.accountId,
      client: context.client,
      marketingOptIn: parsed.data.marketingOptIn,
    });
    if (!marketingPreference.ok) {
      return contactFailure(
        marketingPreference.code,
        "연락처는 저장했지만 광고성 소식 설정을 저장하지 못했어요.",
        503,
      );
    }
    marketingOptIn = marketingPreference.data;
  } else {
    const marketingPreference = await readPrivateContactMarketingPreference({
      accountId: context.accountId,
      client: context.client,
    });
    if (marketingPreference.ok) marketingOptIn = marketingPreference.data;
  }

  return contactSuccess(toPrivateContactPayload(saved.data, marketingOptIn));
}

export async function DELETE(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return contactFailure(
      "cross_site_request",
      "요청을 확인하지 못했어요.",
      403,
    );
  }

  const parsed = deleteSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return contactFailure(
      "contact_invalid",
      "삭제 요청을 확인하지 못했어요.",
      422,
    );
  }

  const context = await getContactContext();
  if (!context.ok) return context.response;
  const deleted =
    parsed.data.field === "email"
      ? await deletePrivateEmail({
          accountId: context.accountId,
          client: context.client,
        })
      : await deletePrivateMobilePhone({
          accountId: context.accountId,
          cancelActiveEntries: parsed.data.cancelActiveEntries,
          client: context.client,
        });

  if (!deleted.ok) {
    if (deleted.code === "active_event_entry_exists") {
      return contactFailure(
        deleted.code,
        "참여 중인 이벤트가 있어요. 응모도 함께 취소할지 확인해 주세요.",
        409,
      );
    }
    return contactFailure(
      deleted.code,
      "연락처를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
      503,
    );
  }

  const marketingPreference = await readPrivateContactMarketingPreference({
    accountId: context.accountId,
    client: context.client,
  });
  return contactSuccess(
    toPrivateContactPayload(
      deleted.data,
      marketingPreference.ok ? marketingPreference.data : false,
    ),
  );
}

async function getContactContext() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth;

  const client = createSupabaseServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: createApiClosedResponse("supabase_env_missing"),
    };
  }

  const account = await ensureAccountForUser(client, auth.user);
  if (!account.ok) {
    return {
      ok: false as const,
      response: contactFailure(
        "account_unavailable",
        "계정 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
      ),
    };
  }

  return {
    accountId: account.accountId,
    client,
    ok: true as const,
  };
}

function contactSuccess(contact: ReturnType<typeof toPrivateContactPayload>) {
  return NextResponse.json(
    { contact, ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

function contactFailure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    {
      headers: { "cache-control": "private, no-store" },
      status,
    },
  );
}
