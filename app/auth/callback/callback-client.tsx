"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function pickMessage(payload: Record<string, unknown>, fallback: string): string {
  const error = String(payload.error || "").trim();
  if (error) {
    return error;
  }
  const message = String(payload.message || "").trim();
  if (message) {
    return message;
  }
  return fallback;
}

function normalizeNextPath(raw: string): string {
  const value = String(raw || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/archive-review";
  }
  return value;
}

async function parseJsonObject(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }
    return payload as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function AuthCallbackClient(props: { authIssuer: string }): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("正在校验授权回跳...");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function run(): Promise<void> {
      const issuer = String(props.authIssuer || "").trim().replace(/\/$/, "");
      if (!issuer) {
        if (active) {
          setError("auth_not_configured");
          setStatus("账号服务未配置");
        }
        return;
      }

      const authorized = String(searchParams.get("authorized") || "").trim();
      const state = String(searchParams.get("state") || "").trim();
      if (authorized !== "1" || !state) {
        if (active) {
          setError("authorization_not_completed");
          setStatus("授权未完成，请重新发起登录");
        }
        return;
      }

      try {
        setStatus("正在写入应用会话...");
        const finalizeResponse = await fetch("/api/auth/session/finalize", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            state,
          }),
        });
        const finalizePayload = await parseJsonObject(finalizeResponse);
        if (!finalizeResponse.ok) {
          throw new Error(pickMessage(finalizePayload, "failed_to_finalize_session"));
        }

        const nextPath = normalizeNextPath(String(finalizePayload.next || "/archive-review"));
        if (active) {
          setStatus("登录完成，正在跳转...");
          setError("");
          router.replace(nextPath);
          router.refresh();
        }
      } catch (runError) {
        if (active) {
          const reason = runError instanceof Error ? runError.message : "auth_callback_failed";
          setError(reason);
          setStatus("授权回跳处理失败");
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [props.authIssuer, router, searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          border: "1px solid #d4d4d8",
          borderRadius: "12px",
          padding: "24px",
          background: "#ffffff",
        }}
      >
        <p style={{ margin: 0, color: "#52525b", fontSize: "14px" }}>Article DB Access</p>
        <h1 style={{ marginTop: "8px", marginBottom: "8px", fontSize: "24px" }}>统一账号登录</h1>
        <p style={{ margin: 0, color: "#18181b" }}>{status}</p>
        {error ? (
          <p style={{ marginTop: "10px", marginBottom: 0, color: "#b91c1c" }}>错误: {error}</p>
        ) : null}
      </section>
    </main>
  );
}
