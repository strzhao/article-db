import { NextResponse } from "next/server";
import { authenticateAccessToken } from "@/lib/article-db/auth";
import {
  applyGatewaySessionCookie,
  clearAuthStateCookie,
  createGatewaySessionCookieValue,
  readAuthStateCookie,
  verifyAuthStateCookieValue,
} from "@/lib/article-db/auth-gateway-session";
import { jsonResponse } from "@/lib/infra/route-utils";

export const runtime = "nodejs";

interface FinalizeBody {
  state?: string;
  accessToken?: string;
}

async function parseBody(request: Request): Promise<FinalizeBody> {
  try {
    const payload = (await request.json()) as FinalizeBody;
    if (!payload || typeof payload !== "object") {
      return {};
    }
    return payload;
  } catch {
    return {};
  }
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const body = await parseBody(request);
  const state = String(body.state || "").trim();
  const accessToken = String(body.accessToken || "").trim();
  if (!state || !accessToken) {
    return jsonResponse(400, { ok: false, error: "invalid_input" }, true);
  }

  const authStateCookie = readAuthStateCookie(request);
  const authState = verifyAuthStateCookieValue(authStateCookie, state);
  if (!authState) {
    const response = NextResponse.json({ ok: false, error: "invalid_state" }, { status: 400 });
    clearAuthStateCookie(response);
    return noStore(response);
  }

  const authResult = await authenticateAccessToken(accessToken);
  if (!authResult.ok) {
    return jsonResponse(
      authResult.status,
      {
        ok: false,
        error: authResult.error,
        message: authResult.message,
      },
      true,
    );
  }

  if (!authResult.user) {
    return jsonResponse(401, { ok: false, error: "invalid_access_token" }, true);
  }

  const response = NextResponse.json(
    {
      ok: true,
      next: authState.next,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        status: authResult.user.status,
      },
    },
    { status: 200 },
  );
  clearAuthStateCookie(response);
  applyGatewaySessionCookie(response, createGatewaySessionCookieValue(authResult.user.email));
  return noStore(response);
}
