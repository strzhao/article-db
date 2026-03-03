"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface UserShape {
  id: string;
  email: string;
  status: string;
}

function normalizeNext(nextValue: string): string {
  const raw = String(nextValue || "").trim();
  if (!raw.startsWith("/")) {
    return "/archive-review";
  }
  return raw;
}

export default function LoginClient(props: { nextPath?: string }): React.ReactNode {
  const router = useRouter();
  const nextPath = useMemo(() => normalizeNext(props.nextPath || ""), [props.nextPath]);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingSend, setPendingSend] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signedInUser, setSignedInUser] = useState<UserShape | null>(null);

  useEffect(() => {
    let active = true;
    async function checkSession(): Promise<void> {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!active || !response.ok) {
          return;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const user = payload.user && typeof payload.user === "object" ? (payload.user as UserShape) : null;
        if (user) {
          setSignedInUser(user);
          router.replace(nextPath);
          router.refresh();
        }
      } catch {
        // Best effort check only.
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  async function sendCode(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("请输入邮箱");
      return;
    }

    setPendingSend(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        setErrorMessage(String(payload.error || payload.message || "发送验证码失败"));
        return;
      }

      setStatusMessage("验证码已发送，请检查邮箱");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发送验证码失败");
    } finally {
      setPendingSend(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!normalizedEmail || !normalizedCode) {
      setErrorMessage("请填写邮箱和验证码");
      return;
    }

    setPendingVerify(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        setErrorMessage(String(payload.error || payload.message || "登录失败"));
        return;
      }

      const user = payload.user && typeof payload.user === "object" ? (payload.user as UserShape) : null;
      if (user) {
        setSignedInUser(user);
      }

      setStatusMessage("登录成功，正在跳转");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setPendingVerify(false);
    }
  }

  async function logout(): Promise<void> {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setSignedInUser(null);
      setCode("");
      setStatusMessage("已退出当前登录状态");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "退出失败");
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Article DB Access</p>
        <h1>账号登录</h1>
        <p className={styles.subtitle}>仅白名单账号可访问归档审查台。</p>
        {checkingSession ? <p className={styles.hint}>正在检查登录状态...</p> : null}

        <form className={styles.form} onSubmit={sendCode}>
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="daniel@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" disabled={pendingSend}>
            {pendingSend ? "发送中..." : "发送验证码"}
          </button>
        </form>

        <form className={styles.form} onSubmit={verifyCode}>
          <label htmlFor="code">验证码</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="\\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" disabled={pendingVerify}>
            {pendingVerify ? "验证中..." : "验证并登录"}
          </button>
        </form>

        {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {signedInUser ? (
          <div className={styles.userBox}>
            <p>当前用户: {signedInUser.email}</p>
            <button type="button" onClick={logout}>
              退出登录
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
