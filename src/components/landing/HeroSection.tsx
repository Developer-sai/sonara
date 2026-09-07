"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { ShimmerText } from "@/components/ui/shimmer-text";

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="aura-field relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/5 px-4 py-1.5 text-xs font-medium"
      >
        <Sparkles className="size-3.5 text-primary" />
        <ShimmerText>New song just dropped? Make your status in 30 seconds.</ShimmerText>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
      >
        Your Music.{" "}
        <span className="text-gradient">Your Aura.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
      >
        Paste a link or search any song, drag it into a layout, and share straight to
        WhatsApp Status, Instagram or Snapchat — as a still image or an animated clip.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <ParticleButton
          size="lg"
          onClick={() => setTimeout(() => router.push("/studio"), 260)}
        >
          Start creating <ArrowRight className="size-4" />
        </ParticleButton>
        <Button size="lg" variant="secondary" asChild>
          <Link href="#gallery">See examples</Link>
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp Status ready
        </span>
        <span className="flex items-center gap-1.5">
          <Video className="size-3.5 text-primary" /> Animated video export
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent" /> No account needed to start
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        className="relative mt-16 flex items-end justify-center gap-4 sm:gap-6"
      >
        <FloatCard src="/sample-assets/sample-sticker.jpg" className="hidden w-36 rotate-[-8deg] sm:block" delay={0} />
        <FloatCard src="/sample-assets/sample-story-solo.jpg" className="w-48 sm:w-60" delay={0.4} elevated />
        <FloatCard src="/sample-assets/sample-grid-heart.jpg" className="hidden w-36 rotate-[8deg] sm:block" delay={0.2} />
      </motion.div>
    </section>
  );
}

function FloatCard({
  src,
  className,
  delay,
  elevated,
}: {
  src: string;
  className?: string;
  delay: number;
  elevated?: boolean;
}) {
  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
      className={`overflow-hidden rounded-3xl border border-white/10 shadow-2xl ${
        elevated ? "z-10 shadow-[0_40px_100px_-30px_var(--aura-1)]" : "opacity-80"
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="SONARA aura preview" className="aspect-[9/16] w-full object-cover" />
    </motion.div>
  );
}
