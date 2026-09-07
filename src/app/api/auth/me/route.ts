import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql, ensureDb } from "@/lib/db";
import type { ConnectedAccount } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, accounts: [] });

  await ensureDb();
  const rows = (await sql`
    SELECT * FROM connected_accounts WHERE user_id = ${user.id} ORDER BY connected_at DESC
  `) as Record<string, unknown>[];

  const accounts: ConnectedAccount[] = rows.map((r) => ({
    id: r.id as string,
    provider: r.provider as ConnectedAccount["provider"],
    displayName: r.display_name as string,
    avatar: (r.avatar as string) ?? null,
    connectedAt: r.connected_at as string,
    mode: r.mode as "oauth" | "demo",
  }));

  return NextResponse.json({ user, accounts });
}
