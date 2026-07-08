import { describe, expect, it } from "vitest";
import { POST as publicProfileResolverPost } from "@/app/api/public-profile-resolver/route";

describe("public profile resolver route before server lookup", () => {
  it("valid profile references stop at the closed lookup gate", async () => {
    const response = await publicProfileResolverPost(
      jsonRequest({
        reference: "https://nuang.example/p/nuang-a7k2m9",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toBe("feature_closed");
    expect(body.code).toBe("public_profile_resolver_lookup_pending");
  });

  it("invalid profile references fail validation before lookup", async () => {
    const response = await publicProfileResolverPost(
      jsonRequest({
        reference: "not-a-profile",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("validation_error");
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/test", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
