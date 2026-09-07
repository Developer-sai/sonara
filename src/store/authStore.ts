"use client";

import { create } from "zustand";
import type { ConnectedAccount, User, Song, MusicProvider } from "@/lib/types";

interface AuthState {
  user: User | null;
  accounts: ConnectedAccount[];
  loading: boolean;
  authModalOpen: boolean;
  authModalTab: "login" | "register";
  setAuthModalOpen: (open: boolean, tab?: "login" | "register") => void;
  fetchMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  connectProvider: (
    provider: MusicProvider
  ) => Promise<{ ok: boolean; demo?: boolean; error?: string }>;
  disconnectAccount: (id: string) => Promise<void>;
  importFromAccount: (provider: MusicProvider) => Promise<Song[]>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accounts: [],
  loading: true,
  authModalOpen: false,
  authModalTab: "login",

  setAuthModalOpen: (open, tab) =>
    set({ authModalOpen: open, authModalTab: tab || get().authModalTab }),

  fetchMe: async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      set({ user: data.user, accounts: data.accounts || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  login: async (username, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Login failed." };
      set({ user: data.user });
      await get().fetchMe();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — please try again." };
    }
  },

  register: async (username, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Registration failed." };
      set({ user: data.user });
      await get().fetchMe();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — please try again." };
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, accounts: [] });
  },

  connectProvider: async (provider) => {
    if (!get().user) {
      set({ authModalOpen: true, authModalTab: "register" });
      return { ok: false, error: "Sign in first to connect an account." };
    }
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Couldn't connect." };
      if (data.redirect) {
        window.location.href = data.redirect;
        return { ok: true };
      }
      await get().fetchMe();
      return { ok: true, demo: Boolean(data.demo) };
    } catch {
      return { ok: false, error: "Network error — please try again." };
    }
  },

  disconnectAccount: async (id) => {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    set({ accounts: get().accounts.filter((a) => a.id !== id) });
  },

  importFromAccount: async (provider) => {
    try {
      const res = await fetch("/api/accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) return [];
      return data.songs || [];
    } catch {
      return [];
    }
  },
}));
