import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Lucid" }] }),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  if (user) {
    setTimeout(() => nav({ to: "/dashboard" }), 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords do not match");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
        nav({ to: "/roles" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent — check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        nav({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    signin: { h: "Welcome back", sub: "Sign in to continue your interviews." },
    signup: { h: "Create your account", sub: "Start practicing in under a minute." },
    forgot: { h: "Reset password", sub: "We'll email you a reset link." },
  } as const;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between border-r border-border bg-foreground p-10 text-background lg:flex">
        <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Lucid</span>
        </Link>
        <div className="relative space-y-4">
          <p className="font-display text-3xl font-semibold leading-tight">
            "Finally, an interview platform where I can <em className="italic font-normal">see</em> exactly why I scored what I did."
          </p>
          <p className="text-sm text-background/60">— Senior SDE candidate</p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 text-xs">
          {[["12k+", "Interviews"], ["94%", "Accuracy"], ["6", "Skill axes"]].map(([n, l]) => (
            <div key={l} className="rounded-lg border border-background/10 bg-background/5 p-3">
              <div className="font-display text-xl font-bold">{n}</div>
              <div className="text-background/50">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Brain className="h-4 w-4" />
            </div>
            <span className="font-display font-bold">Lucid</span>
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{titles[mode].h}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{titles[mode].sub}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <Link to="/auth" search={{ mode: "forgot" }} className="text-xs text-muted-foreground hover:text-foreground">
                      Forgot?
                    </Link>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already have an account? <Link to="/auth" search={{ mode: "signin" }} className="font-medium text-foreground hover:underline">Sign in</Link></>
            ) : (
              <>New here? <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-foreground hover:underline">Create account</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
