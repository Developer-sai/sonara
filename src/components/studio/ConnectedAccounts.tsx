"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Plug, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useStudioStore } from "@/store/studioStore";
import { PROVIDER_META, type MusicProvider } from "@/lib/types";

const CONNECTABLE_PROVIDERS: MusicProvider[] = [
  "spotify",
  "youtube_music",
  "apple_music",
  "soundcloud",
  "deezer",
  "amazon_music",
  "tidal",
];

export default function ConnectedAccounts() {
  const user = useAuthStore((s) => s.user);
  const accounts = useAuthStore((s) => s.accounts);
  const connectProvider = useAuthStore((s) => s.connectProvider);
  const disconnectAccount = useAuthStore((s) => s.disconnectAccount);
  const importFromAccount = useAuthStore((s) => s.importFromAccount);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const addSongs = useStudioStore((s) => s.addSongs);

  const [busy, setBusy] = useState<string | null>(null);

  async function handleConnect(provider: MusicProvider) {
    setBusy(provider);
    const result = await connectProvider(provider);
    setBusy(null);
    if (!result.ok && result.error) {
      toast.error(result.error);
      return;
    }
    if (result.demo) {
      toast.success(`Connected ${PROVIDER_META[provider].label} (demo mode)`);
    }
  }

  async function handleImport(provider: MusicProvider) {
    setBusy(`import-${provider}`);
    const songs = await importFromAccount(provider);
    setBusy(null);
    if (songs.length === 0) {
      toast.error("Nothing to import from that account yet.");
      return;
    }
    addSongs(songs);
    toast.success(`Imported ${songs.length} songs from ${PROVIDER_META[provider].label}`);
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 p-6 text-center">
        <Plug className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sign in to connect Spotify, YouTube Music, Apple Music and more.
        </p>
        <Button size="sm" onClick={() => setAuthModalOpen(true, "register")}>
          Sign up free
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {CONNECTABLE_PROVIDERS.map((provider) => {
        const account = accounts.find((a) => a.provider === provider);
        const meta = PROVIDER_META[provider];
        return (
          <div
            key={provider}
            className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.label.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{meta.label}</p>
              {account ? (
                <p className="truncate text-xs text-muted-foreground">
                  {account.displayName} · <span className="capitalize">{account.mode}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
            {account ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="success" className="hidden sm:inline-flex">
                  <Check className="size-3" /> Linked
                </Badge>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  title={`Import from ${meta.label}`}
                  onClick={() => handleImport(provider)}
                  disabled={busy === `import-${provider}`}
                >
                  {busy === `import-${provider}` ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground"
                  title="Disconnect"
                  onClick={() => disconnectAccount(account.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleConnect(provider)}
                disabled={busy === provider}
              >
                {busy === provider ? <Loader2 className="size-3.5 animate-spin" /> : "Connect"}
              </Button>
            )}
          </div>
        );
      })}
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Spotify &amp; YouTube Music use real sign-in when configured. Platforms without public
        developer access (Apple Music, SoundCloud, Deezer, Amazon Music, TIDAL) connect instantly in
        demo mode so the flow never breaks.
      </p>
    </div>
  );
}
