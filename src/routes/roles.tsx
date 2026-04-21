import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Code2, BarChart3, Cpu, Loader2, ArrowRight } from "lucide-react";
import { ROLE_META, type InterviewRole } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/roles")({
  component: RolesPage,
  head: () => ({ meta: [{ title: "Choose your role — Lucid" }] }),
});

const ROLES: { id: InterviewRole; icon: any; topics: string[] }[] = [
  { id: "sde", icon: Code2, topics: ["DSA", "System Design", "OOP", "Code review"] },
  { id: "data_analyst", icon: BarChart3, topics: ["SQL", "Statistics", "Visualization", "Business sense"] },
  { id: "ml_engineer", icon: Cpu, topics: ["ML theory", "Model tuning", "MLOps", "Math"] },
];

function RolesPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [starting, setStarting] = useState<InterviewRole | null>(null);

  if (!loading && !user) {
    setTimeout(() => nav({ to: "/auth" }), 0);
  }

  async function start(role: InterviewRole) {
    if (!user) return;
    setStarting(role);
    try {
      const { data: gen, error: genErr } = await supabase.functions.invoke("generate-questions", {
        body: { role, count: 5, difficulty: "mixed" },
      });
      if (genErr) throw genErr;
      if (gen?.error) throw new Error(gen.error);

      const { data: interview, error: insErr } = await supabase
        .from("interviews")
        .insert({ user_id: user.id, role, questions: gen.questions })
        .select()
        .single();
      if (insErr) throw insErr;

      nav({ to: "/interview/$id", params: { id: interview.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start interview");
      setStarting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Step 1 of 2</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Choose your interview track</h1>
          <p className="mt-3 text-muted-foreground">
            We'll generate adaptive questions tailored to your role. You can switch later.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {ROLES.map((r) => {
            const meta = ROLE_META[r.id];
            const isStarting = starting === r.id;
            return (
              <button
                key={r.id}
                onClick={() => start(r.id)}
                disabled={!!starting}
                className="group relative flex flex-col items-start rounded-2xl border border-border bg-card p-7 text-left transition-all hover:-translate-y-0.5 hover:border-foreground hover:shadow-elevated disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background transition-colors group-hover:bg-foreground group-hover:text-background">
                  <r.icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{meta.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {r.topics.map((t) => (
                    <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t}</span>
                  ))}
                </div>
                <div className="mt-6 flex w-full items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">5 questions · ~20 min</span>
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">Heads up:</strong> Your camera will be enabled for monitoring. Tab switches and suspicious behavior will be logged.
        </div>
      </main>
    </div>
  );
}
