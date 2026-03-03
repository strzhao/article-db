import {
  authServiceConfigured,
  isValidEmail,
  postAuthService,
} from "@/lib/article-db/auth-bridge";
import { jsonResponse } from "@/lib/infra/route-utils";

export const runtime = "nodejs";

interface SendCodeBody {
  email?: string;
}

async function parseBody(request: Request): Promise<SendCodeBody> {
  try {
    const body = (await request.json()) as SendCodeBody;
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
  if (!isValidEmail(email)) {
    return jsonResponse(400, { ok: false, error: "invalid_input", message: "invalid email" }, true);
  }

  try {
    const upstream = await postAuthService("/api/auth/send-code", { email });
    const payload = Object.keys(upstream.payload).length > 0 ? upstream.payload : { success: upstream.status < 400 };

    return jsonResponse(upstream.status, { ...payload, ok: upstream.status < 400 }, true);
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
