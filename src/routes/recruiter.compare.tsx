import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Loader2, ShieldAlert, ArrowLeft, Trophy } from "lucide-react";
import { ROLE_META, type InterviewRole } from "@/lib/types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis, Legend } from "recharts";
import { useMemo } from "react";

const searchSchema = z.object({ ids: z.string().optional().default("") });

export const Route = createFileRoute("/recruiter/compare")({
  validateSearch: searchSchema,
  component: ComparePage,
  head: () => ({ meta: [{ title: "Compare candidates — Lucid" }] }),
});

const COLORS = ["oklch(0.12 0 0)", "oklch(0.45 0 0)", "oklch(0.65 0 0)", "oklch(0.78 0 0)"];

function ComparePage() {
  const { user, isRecruiter, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const { ids } = Route.useSearch();
  const idList = ids.split(",").filter(Boolean);

  if (!authLoading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data, isLoading } = useQuery({
    queryKey: ["compare", ids],
    queryFn: async () => {
      if (idList.length === 0) return { interviews: [], profiles: {}, decisions: {} };
      const [interviewsRes, decisionsRes] = await Promise.all([
        supabase.from("interviews").select("*").in("id", idList),
        supabase.from("hiring_decisions").select("*").in("interview_id", idList),
      ]);
      const userIds = (interviewsRes.data ?? []).map((i: any) => i.user_id);
      const profilesRes = userIds.length ? await supabase.from("profiles").select("*").in("id", userIds) : { data: [] };
      return {
        interviews: interviewsRes.data ?? [],
        profiles: Object.fromEntries((profilesRes.data ?? []).map((p: any) => [p.id, p])),
        decisions: Object.fromEntries((decisionsRes.data ?? []).map((d: any) => [d.interview_id, d])),
      };
    },
    enabled: !!user && isRecruiter && idList.length > 0,
  });

  const radarData = useMemo(() => {
    if (!data?.interviews) return [];
    const allAxes = new Set<string>();
    data.interviews.forEach((i: any) => Object.keys(i.skill_scores ?? {}).forEach((k) => allAxes.add(k)));
    return Array.from(allAxes).map((axis) => {
      const row: any = { axis: axis.replace(/_/g, " ") };
      data.interviews.forEach((i: any, idx: number) => {
        const profile = data.profiles[i.user_id];
        row[`c${idx}`] = Number((i.skill_scores ?? {})[axis] ?? 0);
        row[`name${idx}`] = profile?.full_name ?? `Candidate ${idx + 1}`;
      });
      return row;
    });
  }, [data]);

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

  if (idList.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Select at least 2 candidates</h1>
          <p className="mt-2 text-sm text-muted-foreground">Go back to the dashboard and check candidates to compare.</p>
          <Link to="/recruiter" className="mt-6 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const interviews = data?.interviews ?? [];
  const profiles = data?.profiles ?? {};
  const decisions = data?.decisions ?? {};

  const ranked = [...interviews].sort((a: any, b: any) => Number(b.overall_score ?? 0) - Number(a.overall_score ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/recruiter" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to dashboard
        </Link>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Side-by-side comparison</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Comparing {interviews.length} candidates</h1>
        </div>

        {/* Ranking strip */}
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {ranked.map((i: any, idx: number) => {
            const profile = profiles[i.user_id];
            const dec = decisions[i.id];
            return (
              <div key={i.id} className={`rounded-2xl border bg-card p-5 ${idx === 0 ? "border-foreground" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">Rank #{idx + 1}</span>
                  {idx === 0 && <Trophy className="h-4 w-4" />}
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{profile?.full_name ?? "—"}</h3>
                <p className="text-xs text-muted-foreground">{ROLE_META[i.role as InterviewRole].short}</p>
                <div className="mt-4 font-display text-4xl font-bold">{Number(i.overall_score ?? 0).toFixed(0)}</div>
                {dec && (
                  <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {dec.recommendation === "strong_hire" ? "Strong Hire" : dec.recommendation === "consider" ? "Consider" : "Reject"}
                  </div>
                )}
                <Link to="/recruiter/candidate/$id" params={{ id: i.id }} className="mt-3 inline-block text-xs font-medium hover:underline">Open profile →</Link>
              </div>
            );
          })}
        </div>

        {/* Radar */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Skill comparison</h2>
          <p className="text-xs text-muted-foreground">Overlay of all skill axes</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(0.85 0 0)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                {interviews.map((i: any, idx: number) => (
                  <Radar
                    key={i.id}
                    name={profiles[i.user_id]?.full_name ?? `Candidate ${idx + 1}`}
                    dataKey={`c${idx}`}
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Metric</th>
                {ranked.map((i: any) => (
                  <th key={i.id} className="px-5 py-3 text-left">{profiles[i.user_id]?.full_name ?? "—"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: "overall", label: "Overall score", get: (i: any) => Number(i.overall_score ?? 0).toFixed(0) },
                { key: "correctness", label: "Correctness", get: (i: any) => Number((i.skill_scores ?? {}).correctness ?? 0).toFixed(0) },
                { key: "clarity", label: "Clarity", get: (i: any) => Number((i.skill_scores ?? {}).clarity ?? 0).toFixed(0) },
                { key: "reasoning", label: "Reasoning", get: (i: any) => Number((i.skill_scores ?? {}).reasoning ?? 0).toFixed(0) },
                { key: "depth", label: "Concept depth", get: (i: any) => Number((i.skill_scores ?? {}).depth ?? 0).toFixed(0) },
                { key: "communication", label: "Communication", get: (i: any) => Number((i.skill_scores ?? {}).communication ?? 0).toFixed(0) },
                { key: "problem_solving", label: "Problem solving", get: (i: any) => Number((i.skill_scores ?? {}).problem_solving ?? 0).toFixed(0) },
              ].map((row) => {
                const values = ranked.map((i: any) => Number(row.get(i)));
                const max = Math.max(...values);
                return (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-muted-foreground">{row.label}</td>
                    {ranked.map((i: any, idx: number) => (
                      <td key={i.id} className={`px-5 py-3 font-mono ${values[idx] === max && max > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        {row.get(i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-border">
                <td className="px-5 py-3 font-medium text-muted-foreground">Recommendation</td>
                {ranked.map((i: any) => {
                  const dec = decisions[i.id];
                  return (
                    <td key={i.id} className="px-5 py-3 text-xs uppercase tracking-wider">
                      {dec ? (dec.recommendation === "strong_hire" ? "✓ Strong Hire" : dec.recommendation === "consider" ? "⚖ Consider" : "✗ Reject") : <span className="text-muted-foreground">Pending</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}