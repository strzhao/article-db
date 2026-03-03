import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, authIssuer } from "@/lib/article-db/auth";

export interface AuthServiceResponse {
  status: number;
  payload: Record<string, unknown>;
}

export interface VerifyCodePayload {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    status: string;
  };
}

function baseUrl(): string {
  return authIssuer().replace(/\/$/, "");
}

export function authServiceConfigured(): boolean {
  return Boolean(baseUrl());
}

export function authServiceEndpoint(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl()}${normalizedPath}`;
}

export async function parseJsonObject(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = (await response.json()) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function postAuthService(
  path: string,
  body: Record<string, unknown>,
  options: { bearerToken?: string } = {},
): Promise<AuthServiceResponse> {
  const url = authServiceEndpoint(path);
  const headers: HeadersInit = {
    "content-type": "application/json",
  };
  if (options.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  return {
    status: response.status,
    payload: await parseJsonObject(response),
  };
}

export function parseVerifyPayload(payload: Record<string, unknown>): VerifyCodePayload | null {
  const accessToken = String(payload.accessToken || "").trim();
  const refreshToken = String(payload.refreshToken || "").trim();
  const userCandidate = payload.user;
  if (!accessToken || !refreshToken || !userCandidate || typeof userCandidate !== "object") {
    return null;
  }

  const user = userCandidate as Record<string, unknown>;
  const email = String(user.email || "").trim().toLowerCase();
  const id = String(user.id || "").trim();
  const status = String(user.status || "ACTIVE").trim() || "ACTIVE";
  if (!email || !id) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id,
      email,
      status,
    },
  };
}

export function isValidEmail(email: string): boolean {
  const normalized = String(email || "").trim();
  return /^\S+@\S+\.\S+$/.test(normalized);
}

export function applySessionCookies(response: NextResponse, payload: VerifyCodePayload): void {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: payload.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: payload.refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}
