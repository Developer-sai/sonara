import { NextRequest, NextResponse } from "next/server";
import { sql, ensureDb } from "@/lib/db";
import { verifyPassword, setSessionCookie, rowToUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    await ensureDb();
    const rows = (await sql`SELECT * FROM users WHERE username = ${username}`) as Record<
      string,
      unknown
    >[];
    const row = rows[0];

    if (!row) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, row.password_hash as string);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    await setSessionCookie(row.id as string);
    return NextResponse.json({ user: rowToUser(row) });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Something went wrong signing you in." }, { status: 500 });
  }
}
