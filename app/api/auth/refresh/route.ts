import { NextResponse } from "next/server";
import {
  applySessionCookies,
  authServiceConfigured,
  parseVerifyPayload,
  postAuthService,
} from "@/lib/article-db/auth-bridge";
import { REFRESH_TOKEN_COOKIE_NAME, isEmailInAllowlist } from "@/lib/article-db/auth";
import { jsonResponse } from "@/lib/infra/route-utils";

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
  if (!authServiceConfigured()) {
    return jsonResponse(500, { ok: false, error: "auth_service_not_configured" }, true);
  }

  const refreshToken = readRefreshToken(request);
  if (!refreshToken) {
    return jsonResponse(400, { ok: false, error: "missing_refresh_token" }, true);
  }

  try {
    const upstream = await postAuthService(
      "/api/auth/refresh",
      {
        refreshToken,
      },
      {
        bearerToken: refreshToken,
      },
    );

    if (upstream.status >= 400) {
      return jsonResponse(upstream.status, { ...upstream.payload, ok: false }, true);
    }

    const verified = parseVerifyPayload(upstream.payload);
    if (!verified) {
      return jsonResponse(502, { ok: false, error: "invalid_auth_response" }, true);
    }

    if (!isEmailInAllowlist(verified.user.email)) {
      return jsonResponse(403, { ok: false, error: "forbidden_not_in_allowlist" }, true);
    }

    const response = NextResponse.json({ ok: true, user: verified.user }, { status: 200 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    applySessionCookies(response, verified);
    return response;
  } catch (error) {
    return jsonResponse(
      502,
      {
        ok: false,
        error: "auth_service_unavailable",
        message: error instanceof Error ? error.message : "unknown",
      },
      true,
    );
  }
}
