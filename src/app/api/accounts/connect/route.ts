import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb, nowIso } from "@/lib/db";
import { randomUUID } from "node:crypto";
import {
  oauthKindFor,
  isOAuthConfigured,
  buildAuthorizeUrl,
  DEMO_SEED_TRACKS,
} from "@/lib/accountProviders";
import { PROVIDER_META, type MusicProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to connect an account." }, { status: 401 });
    }

    const body = await req.json();
    const provider = String(body.provider || "") as MusicProvider;
    if (!PROVIDER_META[provider]) {
      return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
    }

    const kind = oauthKindFor(provider);
    const origin = req.nextUrl.origin;

    if (kind && isOAuthConfigured(kind)) {
      // Real OAuth is configured — hand back the authorize URL to redirect the browser to.
      const state = Buffer.from(
        JSON.stringify({ userId: user.id, provider, nonce: randomUUID() })
      ).toString("base64url");
      const url = buildAuthorizeUrl(kind, origin, state);
      return NextResponse.json({ redirect: url });
    }

    // No developer credentials configured (or platform has no public self-serve OAuth,
    // e.g. Apple Music / Amazon Music / TIDAL) — instantly simulate a 1-click connection
    // so the ingestion flow keeps working end-to-end without any errors.
    await ensureDb();
    const id = randomUUID();
    const label = PROVIDER_META[provider].label;
    const displayName = `${user.username} on ${label}`;
    const connectedAt = nowIso();
    await sql`
      INSERT INTO connected_accounts (id, user_id, provider, display_name, avatar, mode, connected_at)
      VALUES (${id}, ${user.id}, ${provider}, ${displayName}, ${user.avatar ?? null}, 'demo', ${connectedAt})
      ON CONFLICT (user_id, provider) DO UPDATE SET
        display_name = excluded.display_name,
        mode = 'demo',
        connected_at = excluded.connected_at
    `;

    return NextResponse.json({
      connected: true,
      demo: true,
      seed: DEMO_SEED_TRACKS[provider] || [],
    });
  } catch (err) {
    console.error("[accounts/connect]", err);
    return NextResponse.json({ error: "Couldn't connect that account." }, { status: 500 });
  }
}
