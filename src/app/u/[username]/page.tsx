import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { sql, ensureDb } from "@/lib/db";
import type { CanvasElement, ImageCanvasElement } from "@/lib/types";
import ProfileGallery, { type ProfileCloud } from "@/components/profile/ProfileGallery";

interface ProfileData {
  username: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  clouds: ProfileCloud[];
}

async function loadProfile(username: string): Promise<ProfileData | null> {
  await ensureDb();
  const userRows = (await sql`SELECT * FROM users WHERE username = ${username}`) as Record<
    string,
    unknown
  >[];
  const user = userRows[0];
  if (!user) return null;

  const rows = (await sql`
    SELECT * FROM clouds WHERE user_id = ${user.id as string} AND is_public = 1 ORDER BY created_at DESC
  `) as Record<string, unknown>[];

  const clouds: ProfileCloud[] = rows.map((row) => {
    const elements: CanvasElement[] = JSON.parse((row.elements_json as string) || "[]");
    const firstImage = elements.find((e): e is ImageCanvasElement => e.type === "image");
    return {
      id: row.id as string,
      title: (row.title as string) || "Untitled aura",
      shareSlug: row.share_slug as string,
      thumbnail: firstImage?.src ?? null,
      elementCount: elements.length,
      createdAt: row.created_at as string,
    };
  });

  return {
    username: user.username as string,
    avatar: (user.avatar as string) ?? null,
    bio: (user.bio as string) ?? null,
    createdAt: user.created_at as string,
    clouds,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "User not found" };
  return {
    title: `@${profile.username}`,
    description: `${profile.clouds.length} public music auras by @${profile.username} on SONARA.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  return (
    <div className="aura-field min-h-[calc(100vh-4rem)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt={profile.username}
              className="size-20 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--aura-1)] to-[var(--aura-2)] text-2xl font-bold text-white">
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-2xl font-bold">@{profile.username}</h1>
          {profile.bio && <p className="max-w-md text-sm text-muted-foreground">{profile.bio}</p>}
          <p className="text-xs text-muted-foreground">
            {profile.clouds.length} public aura{profile.clouds.length === 1 ? "" : "s"}
          </p>
        </div>

        {profile.clouds.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            @{profile.username} hasn&apos;t shared any auras publicly yet.{" "}
            <Link href="/studio" className="text-primary hover:underline">
              Make your own
            </Link>
          </p>
        ) : (
          <ProfileGallery clouds={profile.clouds} />
        )}
      </div>
    </div>
  );
}
