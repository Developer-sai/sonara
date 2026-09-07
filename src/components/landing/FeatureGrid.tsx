"use client";

import { motion } from "motion/react";
import { Link2, Users, Wand2, Download, Cloud, Shapes } from "lucide-react";

const FEATURES = [
  {
    icon: Link2,
    title: "Paste any link",
    description:
      "Spotify, Apple Music, YouTube Music, SoundCloud, Deezer, Amazon Music, TIDAL — no account or dev key needed.",
  },
  {
    icon: Users,
    title: "Connect your accounts",
    description: "Link Spotify or YouTube for real top tracks and history — or try any platform in one-click demo mode.",
  },
  {
    icon: Shapes,
    title: "7 visual layouts",
    description: "Story cards, 2×3 and 3×3 grids, music stickers, aura clouds, polaroids and Y2K chrome.",
  },
  {
    icon: Wand2,
    title: "Auto aura palette",
    description: "SONARA samples your album art to generate a living gradient background, unique every time.",
  },
  {
    icon: Cloud,
    title: "Save & share",
    description: "Keep a library of clouds, or publish a public link anyone can view — even without an account.",
  },
  {
    icon: Download,
    title: "Studio-quality export",
    description: "1080px canvas rendering for crisp, story-ready PNGs at 9:16, 1:1 or 4:5 — no watermarks on your art.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto mb-12 max-w-xl text-center"
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything you need to visualize sound</h2>
        <p className="mt-3 text-muted-foreground">
          Built to work instantly — with or without connected accounts.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="glass rounded-2xl p-6"
          >
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--aura-1)]/25 to-[var(--aura-2)]/25 text-primary">
              <f.icon className="size-5" />
            </span>
            <h3 className="mb-1.5 font-display text-base font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
