"use client";

import * as React from "react";
import { animate, utils } from "animejs";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

const PARTICLE_COLORS = ["#b06bff", "#ff5fa8", "#5fc9ff", "#ffd35f"];

/**
 * A Button that bursts a handful of small particles from the click point.
 * Powered by anime.js (`animate`) — a lightweight, dependency-free effect
 * that doesn't touch the button's own click handling.
 */
export function ParticleButton({
  className,
  variant,
  size,
  onClick,
  children,
  particleCount = 14,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { particleCount?: number }) {
  const containerRef = React.useRef<HTMLSpanElement>(null);

  function burst(e: React.MouseEvent<HTMLButtonElement>) {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const originX = e.clientX - rect.left;
      const originY = e.clientY - rect.top;

      for (let i = 0; i < particleCount; i++) {
        const dot = document.createElement("span");
        const size = utils.random(4, 9);
        dot.style.position = "absolute";
        dot.style.left = `${originX}px`;
        dot.style.top = `${originY}px`;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.borderRadius = "999px";
        dot.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        dot.style.pointerEvents = "none";
        dot.style.willChange = "transform, opacity";
        container.appendChild(dot);

        const angle = utils.random(0, 360) * (Math.PI / 180);
        const distance = utils.random(30, 70);

        animate(dot, {
          translateX: Math.cos(angle) * distance,
          translateY: Math.sin(angle) * distance,
          scale: [1, 0],
          opacity: [1, 0],
          duration: utils.random(500, 800),
          ease: "outExpo",
          onComplete: () => dot.remove(),
        });
      }
    }
    onClick?.(e);
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("relative overflow-visible", className)}
      onClick={burst}
      {...props}
    >
      <span ref={containerRef} className="pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </Button>
  );
}
