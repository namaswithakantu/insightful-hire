import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { ROLE_META, VIOLATION_LABEL } from "@/lib/types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";

export const Route = createFileRoute("/feedback/$id")({
  component: FeedbackPage,
  head: () => ({ meta: [{ title: "Interview feedback — Lucid" }] }),
});

function FeedbackPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  if (!authLoading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data, isLoading } = useQuery({
    queryKey: ["feedback", id],
    queryFn: async () => {
      const [interview, answers, violations] = await Promise.all([
        supabase.from("interviews").select("*").eq("id", id).single(),
        supabase.from("answers").select("*").eq("interview_id", id).order("question_index"),
        supabase.from("violations").select("*").eq("interview_id", id),
      ]);
      return {
        interview: interview.data,
        answers: answers.data ?? [],
        violations: violations.data ?? [],
      };
    },
  });

  if (isLoading || !data?.interview) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const { interview, answers, violations } = data;
  const meta = ROLE_META[interview.role as keyof typeof ROLE_META];
  const skills = (interview.skill_scores as Record<string, number>) ?? {};
  const radarData = Object.entries(skills).map(([k, v]) => ({ axis: k.replace(/_/g, " "), value: v }));
  const score = Number(interview.overall_score ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Interview complete</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{meta.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{new Date(interview.completed_at ?? interview.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-border bg-card px-7 py-5">
            <div>
              <div className="font-display text-5xl font-bold leading-none">{score.toFixed(0)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">Overall score</div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-sm">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldAlert className={`h-4 w-4 ${violations.length ? "text-destructive" : "text-muted-foreground"}`} />
                {violations.length} violation{violations.length !== 1 && "s"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{answers.length} questions answered</div>
            </div>
          </div>
        </div>

        {/* Top grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Skill radar */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Skill breakdown</h2>
            <p className="text-xs text-muted-foreground">Score per evaluation axis (0–100)</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(0.85 0 0)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="oklch(0.12 0 0)" fill="oklch(0.12 0 0)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strengths / weaknesses */}
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Strengths
              </h3>
              <ul className="mt-3 space-y-2">
                {(interview.strengths ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span>•</span>{s}</li>
                ))}
                {!(interview.strengths ?? []).length && <li className="text-sm text-muted-foreground">No notable strengths identified.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                <AlertCircle className="h-4 w-4" /> Areas to improve
              </h3>
              <ul className="mt-3 space-y-2">
                {(interview.weaknesses ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span>•</span>{s}</li>
                ))}
                {!(interview.weaknesses ?? []).length && <li className="text-sm text-muted-foreground">No major gaps detected.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Per-question */}
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold tracking-tight">Question-by-question feedback</h2>
          <div className="mt-5 space-y-4">
            {answers.map((a: any, i: number) => (
              <details key={a.id} className="group rounded-xl border border-border bg-card open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs text-muted-foreground">Q{i + 1}</span>
                    <span className="font-medium">{a.question_text}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-2xl font-bold">{Number(a.score ?? 0).toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </summary>
                <div className="space-y-5 border-t border-border p-5">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[["Correctness", a.correctness], ["Clarity", a.clarity], ["Reasoning", a.reasoning], ["Depth", a.depth]].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-muted px-3 py-3">
                        <div className="font-display text-xl font-bold">{Number(v ?? 0).toFixed(0)}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l as string}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Your answer</p>
                    <p className="mt-1 rounded-lg border border-border bg-background p-3 text-sm leading-relaxed font-mono whitespace-pre-wrap">{a.answer_text}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Feedback</p>
                    <p className="mt-1 text-sm leading-relaxed">{a.feedback}</p>
                  </div>
                  {a.missing_concepts?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Missing concepts</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.missing_concepts.map((m: string, j: number) => (
                          <span key={j} className="rounded-md border border-border bg-background px-2 py-0.5 text-xs">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.improvements?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">How to improve</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {a.improvements.map((s: string, j: number) => <li key={j} className="flex gap-2"><span className="text-muted-foreground">→</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>

        {violations.length > 0 && (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h3 className="flex items-center gap-2 font-display font-semibold text-destructive">
              <ShieldAlert className="h-4 w-4" /> Integrity violations logged
            </h3>
            <ul className="mt-3 space-y-1 text-sm">
              {violations.map((v: any) => (
                <li key={v.id} className="flex items-center justify-between font-mono text-xs">
                  <span>{VIOLATION_LABEL[v.type as keyof typeof VIOLATION_LABEL]}</span>
                  <span className="text-muted-foreground">{new Date(v.created_at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-end gap-3">
          <Button variant="outline" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
          <Button asChild><Link to="/roles">Take another interview <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
        </div>
      </main>
    </div>
  );
}
