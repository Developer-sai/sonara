import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sql, ensureDb } from "./db";
import type { User } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "sonara_dev_secret_change_me";
const COOKIE_NAME = "sonara_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export async function setSessionCookie(userId: string) {
  const token = signSession(userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    bio: (row.bio as string) ?? null,
    avatar: (row.avatar as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    await ensureDb();
    const rows = (await sql`SELECT * FROM users WHERE id = ${payload.sub}`) as Record<
      string,
      unknown
    >[];
    if (!rows[0]) return null;
    return rowToUser(rows[0]);
  } catch {
    return null;
  }
}
