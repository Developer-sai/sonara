"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LogOut, User as UserIcon, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--aura-1)] to-[var(--aura-2)] text-white shadow-[0_0_20px_-4px_var(--aura-1)]">
            <Sparkles className="size-4" />
          </span>
          SONARA
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/studio"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname === "/studio" && "bg-white/8 text-foreground"
            )}
          >
            Studio
          </Link>
          <Link
            href="/#gallery"
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Gallery
          </Link>
          <Link
            href="/our-sound"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname === "/our-sound" && "bg-white/8 text-foreground"
            )}
          >
            Our Sound
          </Link>
          <Link
            href="/wrapped"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname === "/wrapped" && "bg-white/8 text-foreground"
            )}
          >
            Wrapped
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/70 py-1 pl-1 pr-3 transition-colors hover:bg-white/5">
                  <Avatar className="size-7">
                    <AvatarImage src={user.avatar || undefined} alt={user.username} />
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">@{user.username}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/studio">
                    <LayoutGrid className="size-4" /> Studio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/studio?panel=library">
                    <UserIcon className="size-4" /> My clouds
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/u/${user.username}`}>
                    <UserIcon className="size-4" /> Public profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => logout()}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setAuthModalOpen(true, "login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => setAuthModalOpen(true, "register")}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
