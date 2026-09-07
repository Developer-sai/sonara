import { NextRequest, NextResponse } from "next/server";
import { sql, ensureDb, nowIso } from "@/lib/db";
import { hashPassword, setSessionCookie, rowToUser } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: letters, numbers, dot or underscore." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await ensureDb();
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const avatar = `https://api.dicebear.com/9.x/thumbs/svg?seed=${username}`;
    const createdAt = nowIso();
    await sql`
      INSERT INTO users (id, username, password_hash, avatar, created_at)
      VALUES (${id}, ${username}, ${passwordHash}, ${avatar}, ${createdAt})
    `;

    await setSessionCookie(id);

    const rows = (await sql`SELECT * FROM users WHERE id = ${id}`) as Record<string, unknown>[];
    return NextResponse.json({ user: rowToUser(rows[0]) });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "Something went wrong creating your account." }, { status: 500 });
  }
}
