import { cn } from "@/lib/utils";

export function ShimmerText({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "inline-block bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-text",
        "bg-[linear-gradient(110deg,var(--muted)_35%,#fff_50%,var(--muted)_65%)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
