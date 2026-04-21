import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Plus, ShieldAlert, TrendingUp } from "lucide-react";
import { ROLE_META, type InterviewRole } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — Lucid" }] }),
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  if (!loading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["interviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const completed = interviews.filter((i: any) => i.status === "completed");
  const avg = completed.length
    ? completed.reduce((s: number, i: any) => s + Number(i.overall_score ?? 0), 0) / completed.length
    : 0;
  const best = completed.reduce((m: number, i: any) => Math.max(m, Number(i.overall_score ?? 0)), 0);

  const timeline = [...completed].reverse().map((i: any, idx: number) => ({
    n: idx + 1,
    score: Number(i.overall_score ?? 0),
    date: new Date(i.completed_at ?? i.created_at).toLocaleDateString(),
  }));

  // Skill heatmap aggregation
  const allSkills: Record<string, number[]> = {};
  completed.forEach((i: any) => {
    Object.entries(i.skill_scores ?? {}).forEach(([k, v]: any) => {
      allSkills[k] = allSkills[k] || [];
      allSkills[k].push(Number(v));
    });
  });
  const heatmap = Object.entries(allSkills).map(([k, arr]) => ({
    skill: k.replace(/_/g, " "),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
  }));

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Your dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track progress, review past interviews, identify gaps.</p>
          </div>
          <Button asChild size="lg" className="h-11"><Link to="/roles"><Plus className="mr-1.5 h-4 w-4" /> New interview</Link></Button>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Interviews", value: interviews.length, sub: `${completed.length} completed` },
            { label: "Average score", value: avg.toFixed(0), sub: "Across completed" },
            { label: "Personal best", value: best.toFixed(0), sub: "Highest overall" },
            { label: "Trend", value: timeline.length >= 2 ? `${(timeline.at(-1)!.score - timeline[0].score >= 0 ? "+" : "")}${(timeline.at(-1)!.score - timeline[0].score).toFixed(0)}` : "—", sub: "First → latest" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className="mt-2 font-display text-3xl font-bold">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Growth timeline</h2>
                <p className="text-xs text-muted-foreground">Overall score across attempts</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-5 h-64">
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid stroke="oklch(0.92 0 0)" strokeDasharray="3 3" />
                    <XAxis dataKey="n" tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "oklch(0.12 0 0)", border: "none", borderRadius: 8, color: "white", fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="oklch(0.12 0 0)" strokeWidth={2} dot={{ r: 4, fill: "oklch(0.12 0 0)" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Complete an interview to see your trajectory.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Skill heatmap</h2>
            <p className="text-xs text-muted-foreground">Average across all interviews</p>
            <div className="mt-5 space-y-3">
              {heatmap.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
              {heatmap.map((s) => (
                <div key={s.skill}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize font-medium">{s.skill}</span>
                    <span className="font-mono text-muted-foreground">{s.avg.toFixed(0)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-foreground transition-all" style={{ width: `${s.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold">Interview history</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {interviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <p className="font-display text-lg font-semibold">No interviews yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">Start your first AI interview — pick a role and we'll generate adaptive questions in seconds.</p>
                <Button asChild className="mt-2"><Link to="/roles">Start interview</Link></Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Score</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((i: any) => {
                    const m = ROLE_META[i.role as InterviewRole];
                    return (
                      <tr key={i.id} className="border-t border-border transition-colors hover:bg-muted/40">
                        <td className="px-5 py-4 font-medium">{m.short}</td>
                        <td className="px-5 py-4 text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${i.status === "completed" ? "border-border" : "border-border bg-muted text-muted-foreground"}`}>
                            {i.status === "completed" ? "Completed" : "In progress"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-display text-lg font-bold">
                          {i.overall_score != null ? Number(i.overall_score).toFixed(0) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {i.status === "completed" ? (
                            <Link to="/feedback/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                              View <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <Link to="/interview/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                              Resume <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
