import { requireArticleDbAuth } from "@/lib/article-db/auth";
import { markFlomoArchivePushBatchSent } from "@/lib/article-db/repository";
import { jsonResponse } from "@/lib/infra/route-utils";

export const runtime = "nodejs";
export const maxDuration = 120;
export const preferredRegion = ["sin1"];

export async function POST(
  request: Request,
  context: { params: Promise<{ batch_key: string }> },
): Promise<Response> {
  const unauthorized = requireArticleDbAuth(request);
  if (unauthorized) {
    return jsonResponse(401, { ok: false, error: unauthorized }, true);
  }

  const params = await context.params;
  const batchKey = String(params.batch_key || "").trim();
  if (!batchKey) {
    return jsonResponse(400, { ok: false, error: "Missing batch_key" }, true);
  }

  try {
    const consumedCount = await markFlomoArchivePushBatchSent(batchKey);
    return jsonResponse(
      200,
      {
        ok: true,
        generated_at: new Date().toISOString(),
        batch_key: batchKey,
        consumed_count: consumedCount,
      },
      true,
    );
  } catch (error) {
    return jsonResponse(400, { ok: false, error: error instanceof Error ? error.message : String(error) }, true);
  }
}
