"use client";

import { useEffect, useState, type RefObject } from "react";
import { toast } from "sonner";
import {
  Download,
  Save,
  Share2,
  Loader2,
  Link as LinkIcon,
  Video,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { useStudioStore } from "@/store/studioStore";
import { useAuthStore } from "@/store/authStore";
import type { FreeformCanvasHandle } from "./FreeformCanvas";

function filenameBase(title: string) {
  return (title || "sonara-aura").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function ExportBar({
  canvasRef,
}: {
  canvasRef: RefObject<FreeformCanvasHandle | null>;
}) {
  const [downloading, setDownloading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [canVideo, setCanVideo] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const user = useAuthStore((s) => s.user);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const store = useStudioStore();

  useEffect(() => {
    setCanVideo(Boolean(canvasRef.current?.canExportVideo()));
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requireElements() {
    if (store.elements.length === 0) {
      toast.error("Add a photo or text first.");
      return false;
    }
    return true;
  }

  async function handleDownload() {
    if (!requireElements()) return;
    setDownloading(true);
    try {
      const blob = await canvasRef.current?.exportPng();
      if (!blob) {
        toast.error("Couldn't render the image — try again.");
        return;
      }
      downloadBlob(blob, `${filenameBase(store.title)}.png`);
      toast.success("Downloaded — share your aura!");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadVideo() {
    if (!requireElements()) return;
    setRecording(true);
    toast.info("Recording a short loop…");
    try {
      const blob = await canvasRef.current?.exportVideo(4500);
      if (!blob) {
        toast.error("Video export isn't supported in this browser — try Download PNG instead.");
        return;
      }
      downloadBlob(blob, `${filenameBase(store.title)}.webm`);
      toast.success("Video downloaded!");
    } finally {
      setRecording(false);
    }
  }

  async function handleShareToApps() {
    if (!requireElements()) return;
    setSharing(true);
    try {
      const blob = await canvasRef.current?.exportPng();
      if (!blob) {
        toast.error("Couldn't render the image — try again.");
        return;
      }
      const file = new File([blob], `${filenameBase(store.title)}.png`, { type: "image/png" });
      const shareData = {
        files: [file],
        title: store.title || "My aura",
        text: "Made with SONARA — sonara.app",
      };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        // Some browsers support share() without file support — fall back to a link share.
        await navigator.share({ title: shareData.title, text: shareData.text, url: window.location.origin });
      } else {
        toast.error("Sharing isn't supported here — try Download PNG and share it manually.");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleSave(makePublic: boolean) {
    if (!user) {
      setAuthModalOpen(true, "register");
      return;
    }
    if (!requireElements()) return;
    setSaving(true);
    try {
      const payload = {
        title: store.title,
        subtitle: store.subtitle,
        aspectRatio: store.aspectRatio,
        theme: store.theme,
        items: store.songs,
        elements: store.elements,
        isPublic: makePublic,
      };
      const res = await fetch(
        store.cloudId ? `/api/clouds/${store.cloudId}` : "/api/clouds",
        {
          method: store.cloudId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save your cloud.");
        return;
      }
      const cloud = data.cloud;
      if (cloud?.id) useStudioStore.setState({ cloudId: cloud.id, isDirty: false, savedAt: Date.now() });
      if (makePublic && cloud?.shareSlug) {
        const url = `${window.location.origin}/share/${cloud.shareSlug}`;
        setShareUrl(url);
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast.success("Public link copied to clipboard!");
      } else {
        toast.success("Saved to your clouds.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button data-action="save" variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
        <Button data-action="share" variant="secondary" onClick={() => handleSave(true)} disabled={saving}>
          <LinkIcon className="size-4" /> Get link
        </Button>
        <ParticleButton onClick={handleDownload} disabled={downloading} className="col-span-2 sm:col-span-1">
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download PNG
        </ParticleButton>
      </div>

      {(canVideo || canNativeShare) && (
        <div className="grid grid-cols-2 gap-2">
          {canVideo && (
            <Button data-action="download-video" variant="secondary" onClick={handleDownloadVideo} disabled={recording}>
              {recording ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
              Download Video
            </Button>
          )}
          {canNativeShare && (
            <ParticleButton
              data-action="share-native"
              variant="secondary"
              onClick={handleShareToApps}
              disabled={sharing}
              className={canVideo ? "" : "col-span-2"}
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              Share to WhatsApp &amp; more
            </ParticleButton>
          )}
        </div>
      )}

      {shareUrl && (
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-primary hover:underline"
        >
          <Share2 className="size-3.5 shrink-0" /> {shareUrl}
        </a>
      )}
    </div>
  );
}
