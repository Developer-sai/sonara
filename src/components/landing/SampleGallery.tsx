"use client";

import { motion } from "motion/react";
import Link from "next/link";

const SAMPLES = [
  { src: "/sample-assets/sample-story-solo.jpg", label: "Story Solo" },
  { src: "/sample-assets/sample-grid-jalsa.jpg", label: "2×3 Grid" },
  { src: "/sample-assets/sample-grid-heart.jpg", label: "Grid + Heart" },
  { src: "/sample-assets/sample-sticker.jpg", label: "Music Sticker" },
];

export default function SampleGallery() {
  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="mx-auto mb-10 max-w-xl text-center"
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Made for stories</h2>
        <p className="mt-3 text-muted-foreground">Every layout is tuned for Instagram &amp; Snapchat sharing.</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SAMPLES.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <Link
              href="/studio"
              className="group block overflow-hidden rounded-2xl border border-white/10 shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.src}
                alt={s.label}
                className="aspect-[9/16] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="bg-card/80 p-2.5 text-center text-xs font-medium backdrop-blur">{s.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
