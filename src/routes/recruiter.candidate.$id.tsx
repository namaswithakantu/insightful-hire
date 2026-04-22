import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, ArrowLeft, Sparkles, CheckCircle2, AlertCircle, MinusCircle, XCircle } from "lucide-react";
import { ROLE_META, VIOLATION_LABEL } from "@/lib/types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/recruiter/candidate/$id")({
  component: CandidateDetailPage,
  head: () => ({ meta: [{ title: "Candidate review — Lucid" }] }),
});

type Recommendation = "strong_hire" | "consider" | "reject";

function CandidateDetailPage() {
  const { id } = Route.useParams();
  const { user, isRecruiter, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [rationale, setRationale] = useState("");
  const [generating, setGenerating] = useState(false);

  if (!authLoading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data, isLoading } = useQuery({
    queryKey: ["candidate-detail", id],
    queryFn: async () => {
      const [interview, answers, violations, decision] = await Promise.all([
        supabase.from("interviews").select("*").eq("id", id).single(),
        supabase.from("answers").select("*").eq("interview_id", id).order("question_index"),
        supabase.from("violations").select("*").eq("interview_id", id),
        supabase.from("hiring_decisions").select("*").eq("interview_id", id).maybeSingle(),
      ]);
      const profile = interview.data
        ? (await supabase.from("profiles").select("*").eq("id", interview.data.user_id).single()).data
        : null;
      return {
        interview: interview.data,
        answers: answers.data ?? [],
        violations: violations.data ?? [],
        decision: decision.data,
        profile,
      };
    },
    enabled: !!user && isRecruiter,
  });

  const saveDecision = useMutation({
    mutationFn: async (payload: { recommendation: Recommendation; rationale: string; ai_summary: any }) => {
      if (!user || !data?.interview) throw new Error("Missing context");
      const { error } = await supabase.from("hiring_decisions").upsert({
        interview_id: id,
        candidate_id: data.interview.user_id,
        recruiter_id: user.id,
        recommendation: payload.recommendation,
        rationale: payload.rationale,
        ai_summary: payload.ai_summary,
      }, { onConflict: "interview_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hiring decision saved");
      qc.invalidateQueries({ queryKey: ["candidate-detail", id] });
      qc.invalidateQueries({ queryKey: ["recruiter-data"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to save"),
  });

  async function generateAI() {
    if (!data?.interview) return;
    setGenerating(true);
    try {
      const missing = data.answers.flatMap((a: any) => a.missing_concepts ?? []);
      const { data: rec, error } = await supabase.functions.invoke("hiring-decision", {
        body: {
          role: data.interview.role,
          overall_score: Number(data.interview.overall_score ?? 0),
          skill_scores: data.interview.skill_scores ?? {},
          strengths: data.interview.strengths ?? [],
          weaknesses: data.interview.weaknesses ?? [],
          missing_concepts: Array.from(new Set(missing)),
          violations_count: data.violations.length,
        },
      });
      if (error) throw error;
      if (rec?.error) throw new Error(rec.error);
      setRationale(rec.rationale ?? "");
      saveDecision.mutate({ recommendation: rec.recommendation, rationale: rec.rationale, ai_summary: rec });
    } catch (err: any) {
      toast.error(err?.message ?? "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isRecruiter) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Recruiter access required</h1>
        </div>
      </div>
    );
  }

  if (!data?.interview) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Interview not found</h1>
        </div>
      </div>
    );
  }

  const { interview, answers, violations, profile, decision } = data;
  const meta = ROLE_META[interview.role as keyof typeof ROLE_META];
  const skills = (interview.skill_scores as Record<string, number>) ?? {};
  const radarData = Object.entries(skills).map(([k, v]) => ({ axis: k.replace(/_/g, " "), value: v }));
  const aiSummary = decision?.ai_summary as any;
  const allMissing = Array.from(new Set(answers.flatMap((a: any) => a.missing_concepts ?? [])));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/recruiter" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Candidate review</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{profile?.full_name ?? "—"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile?.email} · {meta.label}</p>
          </div>
          <div className="flex items-center gap-6 rounded-2xl border border-border bg-card px-7 py-5">
            <div>
              <div className="font-display text-5xl font-bold leading-none">{Number(interview.overall_score ?? 0).toFixed(0)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">Overall</div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-sm">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldAlert className={`h-4 w-4 ${violations.length ? "text-destructive" : "text-muted-foreground"}`} />
                {violations.length} violation{violations.length !== 1 && "s"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{answers.length} questions · {new Date(interview.completed_at ?? interview.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* AI Hiring Recommendation */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Sparkles className="h-5 w-5" /> AI hiring recommendation</h2>
              <p className="mt-1 text-sm text-muted-foreground">Explainable verdict based on skill scores, gaps, and integrity signals.</p>
            </div>
            <Button onClick={generateAI} disabled={generating} variant="outline">
              {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {decision ? "Re-generate" : "Generate"}
            </Button>
          </div>

          {decision ? (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <RecommendationBadge recommendation={decision.recommendation as Recommendation} />
                {aiSummary?.confidence && (
                  <span className="text-xs text-muted-foreground">Confidence: <span className="font-mono font-semibold text-foreground">{aiSummary.confidence}%</span></span>
                )}
              </div>
              <p className="text-sm leading-relaxed">{decision.rationale}</p>

              {aiSummary && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Key strengths</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(aiSummary.key_strengths ?? []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span>•</span>{s}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><AlertCircle className="h-3.5 w-3.5" /> Key concerns</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(aiSummary.key_concerns ?? []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span>•</span>{s}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Suggested next steps</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(aiSummary.next_steps ?? []).map((s: string, i: number) => <li key={i} className="flex gap-2"><span>→</span>{s}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* Manual override */}
              <div className="border-t border-border pt-5">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Override decision</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["strong_hire", "consider", "reject"] as Recommendation[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => saveDecision.mutate({ recommendation: r, rationale: rationale || decision.rationale || "", ai_summary: aiSummary })}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        decision.recommendation === r ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                      }`}
                    >
                      {r === "strong_hire" ? "✓ Strong Hire" : r === "consider" ? "⚖ Consider" : "✗ Reject"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              No decision yet. Click <strong>Generate</strong> to produce an AI recommendation.
            </div>
          )}
        </div>

        {/* Performance & gaps */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Skill breakdown</h2>
            <p className="text-xs text-muted-foreground">Score per axis (0–100)</p>
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

          <div className="grid gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold"><CheckCircle2 className="h-4 w-4" /> Strengths</h3>
              <ul className="mt-3 space-y-2">
                {(interview.strengths ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span>•</span>{s}</li>
                ))}
                {!(interview.strengths ?? []).length && <li className="text-sm text-muted-foreground">None identified.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold"><AlertCircle className="h-4 w-4" /> Weaknesses</h3>
              <ul className="mt-3 space-y-2">
                {(interview.weaknesses ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span>•</span>{s}</li>
                ))}
                {!(interview.weaknesses ?? []).length && <li className="text-sm text-muted-foreground">No major gaps detected.</li>}
              </ul>
            </div>
            {allMissing.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-base font-semibold">Missing concepts</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allMissing.map((m, i) => (
                    <span key={i} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Per-question */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">Full interview responses</h2>
          <div className="mt-5 space-y-4">
            {answers.map((a: any, i: number) => (
              <details key={a.id} className="group rounded-xl border border-border bg-card">
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
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Candidate answer</p>
                    <p className="mt-1 rounded-lg border border-border bg-background p-3 text-sm leading-relaxed font-mono whitespace-pre-wrap">{a.answer_text}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">AI feedback</p>
                    <p className="mt-1 text-sm leading-relaxed">{a.feedback}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {violations.length > 0 && (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <h3 className="flex items-center gap-2 font-display font-semibold text-destructive">
              <ShieldAlert className="h-4 w-4" /> Integrity violations
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
      </main>
    </div>
  );
}

function RecommendationBadge({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation === "strong_hire")
    return <span className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"><CheckCircle2 className="h-4 w-4" /> Strong Hire</span>;
  if (recommendation === "consider")
    return <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-semibold"><MinusCircle className="h-4 w-4" /> Consider</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive"><XCircle className="h-4 w-4" /> Reject</span>;
}