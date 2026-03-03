import { NextResponse } from "next/server";
import {
  applySessionCookies,
  authServiceConfigured,
  isValidEmail,
  parseVerifyPayload,
  postAuthService,
} from "@/lib/article-db/auth-bridge";
import { isEmailInAllowlist } from "@/lib/article-db/auth";
import { jsonResponse } from "@/lib/infra/route-utils";

export const runtime = "nodejs";

interface VerifyCodeBody {
  email?: string;
  code?: string;
}

async function parseBody(request: Request): Promise<VerifyCodeBody> {
  try {
    const body = (await request.json()) as VerifyCodeBody;
    if (!body || typeof body !== "object") return {};
    return body;
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!authServiceConfigured()) {
    return jsonResponse(500, { ok: false, error: "auth_service_not_configured" }, true);
  }

  const body = await parseBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return jsonResponse(400, { ok: false, error: "invalid_input" }, true);
  }

  try {
    const upstream = await postAuthService("/api/auth/verify-code", {
      email,
      code,
    });

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

    const response = NextResponse.json(
      {
        ok: true,
        user: verified.user,
      },
      { status: 200 },
    );
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
