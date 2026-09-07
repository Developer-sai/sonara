"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ImageIcon } from "lucide-react";
import { proxied } from "@/lib/proxyImage";

export interface ProfileCloud {
  id: string;
  title: string;
  shareSlug: string;
  thumbnail: string | null;
  elementCount: number;
  createdAt: string;
}

export default function ProfileGallery({ clouds }: { clouds: ProfileCloud[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {clouds.map((cloud, i) => (
        <motion.div
          key={cloud.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
        >
          <Link
            href={`/share/${cloud.shareSlug}`}
            className="group block overflow-hidden rounded-2xl border border-white/10 shadow-xl transition-transform hover:-translate-y-1"
          >
            <div className="aspect-[9/16] w-full overflow-hidden bg-secondary">
              {cloud.thumbnail ? (
                <img
                  src={proxied(cloud.thumbnail)}
                  alt={cloud.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
              )}
            </div>
            <div className="bg-card/80 p-2.5 backdrop-blur">
              <p className="truncate text-xs font-medium">{cloud.title}</p>
              <p className="text-[11px] text-muted-foreground">{cloud.elementCount} elements</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
