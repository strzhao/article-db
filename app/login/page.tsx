import LoginClient from "./login-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickString(input: string | string[] | undefined): string {
  if (Array.isArray(input)) {
    return String(input[0] || "").trim();
  }
  return String(input || "").trim();
}

export default async function LoginPage(props: {
  searchParams?: Promise<SearchParams>;
}): Promise<React.ReactNode> {
  const resolved = (await props.searchParams) || {};
  const nextPath = pickString(resolved.next);

  return <LoginClient nextPath={nextPath} />;
}
