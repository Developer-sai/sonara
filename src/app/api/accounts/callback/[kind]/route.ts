import { NextRequest, NextResponse } from "next/server";
import { sql, ensureDb, nowIso } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { exchangeCode, fetchProfile, type OAuthKind } from "@/lib/accountProviders";
import { PROVIDER_META, type MusicProvider } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const origin = req.nextUrl.origin;
  const studioUrl = new URL("/studio", origin);

  try {
    if (kind !== "spotify" && kind !== "google") {
      studioUrl.searchParams.set("connect_error", "Unknown OAuth provider.");
      return NextResponse.redirect(studioUrl);
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const errorParam = req.nextUrl.searchParams.get("error");

    if (errorParam) {
      studioUrl.searchParams.set("connect_error", "Connection was cancelled.");
      return NextResponse.redirect(studioUrl);
    }
    if (!code || !state) {
      studioUrl.searchParams.set("connect_error", "Missing OAuth response.");
      return NextResponse.redirect(studioUrl);
    }

    let parsedState: { userId: string; provider: MusicProvider };
    try {
      parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
      studioUrl.searchParams.set("connect_error", "Invalid OAuth state.");
      return NextResponse.redirect(studioUrl);
    }

    const tokens = await exchangeCode(kind as OAuthKind, code, origin);
    if (!tokens) {
      studioUrl.searchParams.set("connect_error", "Couldn't complete the connection.");
      return NextResponse.redirect(studioUrl);
    }

    const profile = await fetchProfile(kind as OAuthKind, tokens.accessToken);
    const provider = parsedState.provider;
    const label = PROVIDER_META[provider]?.label || kind;

    await ensureDb();
    const id = randomUUID();
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;
    const displayName = profile?.displayName || label;
    const avatar = profile?.avatar || null;
    const connectedAt = nowIso();

    await sql`
      INSERT INTO connected_accounts (id, user_id, provider, display_name, avatar, mode, access_token, refresh_token, expires_at, connected_at)
      VALUES (${id}, ${parsedState.userId}, ${provider}, ${displayName}, ${avatar}, 'oauth', ${tokens.accessToken}, ${tokens.refreshToken || null}, ${expiresAt}, ${connectedAt})
      ON CONFLICT (user_id, provider) DO UPDATE SET
        display_name = excluded.display_name,
        avatar = excluded.avatar,
        mode = 'oauth',
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, connected_accounts.refresh_token),
        expires_at = excluded.expires_at,
        connected_at = excluded.connected_at
    `;

    studioUrl.searchParams.set("connected", provider);
    return NextResponse.redirect(studioUrl);
  } catch (err) {
    console.error("[accounts/callback]", err);
    studioUrl.searchParams.set("connect_error", "Something went wrong connecting your account.");
    return NextResponse.redirect(studioUrl);
  }
}
