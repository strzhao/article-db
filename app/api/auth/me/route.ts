import { authenticateArticleDbRequest } from "@/lib/article-db/auth";
import { jsonResponse } from "@/lib/infra/route-utils";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const authResult = await authenticateArticleDbRequest(request, {
    allowLegacyToken: false,
    allowUnconfigured: false,
  });

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

  return jsonResponse(
    200,
    {
      ok: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        status: authResult.user.status,
      },
    },
    true,
  );
}
