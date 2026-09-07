"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        className="aura-field glass relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-16"
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to see your aura?</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Free, instant, and installable as an app. Start with a demo set or your own links.
        </p>
        <Button size="lg" className="mt-7" asChild>
          <Link href="/studio">
            Open the Studio <ArrowRight className="size-4" />
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}
