"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Sparkles } from "lucide-react";

export default function AuthModal() {
  const open = useAuthStore((s) => s.authModalOpen);
  const tab = useAuthStore((s) => s.authModalTab);
  const setOpen = useAuthStore((s) => s.setAuthModalOpen);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(mode: "login" | "register") {
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    setLoading(true);
    const result = mode === "login" ? await login(username, password) : await register(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Something went wrong.");
      return;
    }
    toast.success(mode === "login" ? "Welcome back!" : "Account created — welcome to SONARA!");
    setOpen(false);
    setUsername("");
    setPassword("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="aura-field">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="font-display text-sm font-semibold tracking-wide">SONARA</span>
          </div>
          <DialogTitle>Save your aura</DialogTitle>
          <DialogDescription>
            A free account lets you save clouds, connect accounts, and share your public link.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => useAuthStore.setState({ authModalTab: v as "login" | "register" })}
        >
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Log in
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Sign up
            </TabsTrigger>
          </TabsList>

          {(["login", "register"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="mt-4">
              <motion.form
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(mode);
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${mode}-username`}>Username</Label>
                  <Input
                    id={`${mode}-username`}
                    autoComplete="username"
                    placeholder="e.g. moonlit_aura"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${mode}-password`}>Password</Label>
                  <Input
                    id={`${mode}-password`}
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={loading} className="mt-1 w-full">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {mode === "login" ? "Log in" : "Create account"}
                </Button>
              </motion.form>
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          No verification needed — this is a fast demo-friendly account, not for real secrets.
        </p>
      </DialogContent>
    </Dialog>
  );
}
