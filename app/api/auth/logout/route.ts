import { NextResponse } from "next/server";
import {
  authServiceConfigured,
  clearSessionCookies,
  postAuthService,
} from "@/lib/article-db/auth-bridge";
import { REFRESH_TOKEN_COOKIE_NAME } from "@/lib/article-db/auth";

export const runtime = "nodejs";

function readRefreshToken(request: Request): string {
  const raw = String(request.headers.get("cookie") || "").trim();
  if (!raw) {
    return "";
  }

  for (const chunk of raw.split(";")) {
    const [name, ...valueParts] = chunk.split("=");
    if (String(name || "").trim() !== REFRESH_TOKEN_COOKIE_NAME) {
      continue;
    }
    try {
      return decodeURIComponent(valueParts.join("=").trim());
    } catch {
      return valueParts.join("=").trim();
    }
  }

  return "";
}

export async function POST(request: Request): Promise<Response> {
  const refreshToken = readRefreshToken(request);

  if (authServiceConfigured() && refreshToken) {
    try {
      await postAuthService(
        "/api/auth/logout",
        {
          refreshToken,
        },
        {
          bearerToken: refreshToken,
        },
      );
    } catch {
      // Logout is idempotent and local cookie clearing is still safe.
    }
  }

  const response = NextResponse.json({ ok: true, success: true }, { status: 200 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  clearSessionCookies(response);
  return response;
}
