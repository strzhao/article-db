import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/me/route";
import { jwtVerify } from "jose";

vi.mock("jose", () => {
  return {
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  };
});

function setAuthEnv(): void {
  process.env.AUTH_ISSUER = "https://user.stringzhao.life";
  process.env.AUTH_AUDIENCE = "base-account-client";
  process.env.AUTH_JWKS_URL = "https://user.stringzhao.life/.well-known/jwks.json";
  process.env.AUTH_EMAIL_ALLOWLIST = "daniel@example.com";
}

function clearAuthEnv(): void {
  delete process.env.AUTH_ISSUER;
  delete process.env.AUTH_AUDIENCE;
  delete process.env.AUTH_JWKS_URL;
  delete process.env.AUTH_EMAIL_ALLOWLIST;
}

describe("auth me route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearAuthEnv();
  });

  it("returns missing_access_token when token is absent", async () => {
    setAuthEnv();

    const response = await GET(new Request("https://example.com/api/auth/me"));
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe("missing_access_token");
  });

  it("returns user when jwt is valid", async () => {
    setAuthEnv();
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        sub: "usr_daniel",
        email: "daniel@example.com",
      },
      protectedHeader: {
        alg: "RS256",
      },
    } as never);

    const response = await GET(
      new Request("https://example.com/api/auth/me", {
        headers: {
          cookie: "article_db_access_token=jwt-token",
        },
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect((payload.user as Record<string, unknown>).email).toBe("daniel@example.com");
  });
});
