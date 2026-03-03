import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/verify-code/route";

function setAuthEnv(): void {
  process.env.AUTH_ISSUER = "https://user.stringzhao.life";
  process.env.AUTH_AUDIENCE = "base-account-client";
  process.env.AUTH_JWKS_URL = "https://user.stringzhao.life/.well-known/jwks.json";
}

function clearAuthEnv(): void {
  delete process.env.AUTH_ISSUER;
  delete process.env.AUTH_AUDIENCE;
  delete process.env.AUTH_JWKS_URL;
  delete process.env.AUTH_EMAIL_ALLOWLIST;
}

describe("auth verify-code route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearAuthEnv();
  });

  it("writes session cookies for allowlisted user", async () => {
    setAuthEnv();
    process.env.AUTH_EMAIL_ALLOWLIST = "daniel@example.com";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "jwt-token",
          refreshToken: "refresh-token",
          user: {
            id: "usr_daniel",
            email: "daniel@example.com",
            status: "ACTIVE",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await POST(
      new Request("https://example.com/api/auth/verify-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "daniel@example.com",
          code: "123456",
        }),
      }),
    );

    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect((payload.user as Record<string, unknown>).email).toBe("daniel@example.com");
    const setCookieHeader = String(response.headers.get("set-cookie") || "");
    expect(setCookieHeader).toContain("article_db_access_token=");
    expect(setCookieHeader).toContain("article_db_refresh_token=");
  });

  it("returns 403 for user outside allowlist", async () => {
    setAuthEnv();
    process.env.AUTH_EMAIL_ALLOWLIST = "daniel@example.com";

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "jwt-token",
          refreshToken: "refresh-token",
          user: {
            id: "usr_other",
            email: "other@example.com",
            status: "ACTIVE",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await POST(
      new Request("https://example.com/api/auth/verify-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "other@example.com",
          code: "123456",
        }),
      }),
    );

    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("forbidden_not_in_allowlist");
  });
});
