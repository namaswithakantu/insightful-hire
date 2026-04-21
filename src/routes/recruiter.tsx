import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Trophy, Users, ArrowRight } from "lucide-react";
import { ROLE_META, type InterviewRole } from "@/lib/types";
import { useState } from "react";

export const Route = createFileRoute("/recruiter")({
  component: RecruiterPage,
  head: () => ({ meta: [{ title: "Recruiter — Lucid" }] }),
});

function RecruiterPage() {
  const { user, isRecruiter, loading } = useAuth();
  const nav = useNavigate();
  const [filterRole, setFilterRole] = useState<InterviewRole | "all">("all");

  if (!loading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-data"],
    queryFn: async () => {
      const [interviewsRes, profilesRes, violationsRes] = await Promise.all([
        supabase.from("interviews").select("*").eq("status", "completed").order("overall_score", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("violations").select("interview_id"),
      ]);
      return {
        interviews: interviewsRes.data ?? [],
        profiles: profilesRes.data ?? [],
        violationCounts: (violationsRes.data ?? []).reduce((acc: Record<string, number>, v: any) => {
          acc[v.interview_id] = (acc[v.interview_id] ?? 0) + 1;
          return acc;
        }, {}),
      };
    },
    enabled: !!user && isRecruiter,
  });

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isRecruiter) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Recruiter access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a recruiter or admin role to view this page. To enable recruiter mode, ask an admin to add the
            "recruiter" role to your account in the user_roles table.
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const interviews = data?.interviews ?? [];
  const profiles = data?.profiles ?? [];
  const violationCounts = data?.violationCounts ?? {};
  const profileById = Object.fromEntries(profiles.map((p: any) => [p.id, p]));

  const filtered = filterRole === "all" ? interviews : interviews.filter((i: any) => i.role === filterRole);
  const ranked = [...filtered].sort((a, b) => Number(b.overall_score ?? 0) - Number(a.overall_score ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Recruiter mode</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Candidate rankings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Compare candidates with structured, explainable scores.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {(["all", "sde", "data_analyst", "ml_engineer"] as const).map((r) => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterRole === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {r === "all" ? "All roles" : ROLE_META[r].short}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "Candidates", value: new Set(filtered.map((i: any) => i.user_id)).size },
            { icon: Trophy, label: "Top score", value: ranked[0]?.overall_score ? Number(ranked[0].overall_score).toFixed(0) : "—" },
            { icon: ShieldAlert, label: "Flagged interviews", value: filtered.filter((i: any) => violationCounts[i.id] > 0).length },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted"><k.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
                <div className="font-display text-2xl font-bold">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Rank</th>
                <th className="px-5 py-3 text-left">Candidate</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Top skill</th>
                <th className="px-5 py-3 text-left">Flags</th>
                <th className="px-5 py-3 text-right">Score</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">No candidates yet for this filter.</td></tr>
              )}
              {ranked.map((i: any, idx: number) => {
                const profile = profileById[i.user_id];
                const skills = (i.skill_scores as Record<string, number>) ?? {};
                const top = Object.entries(skills).sort(([, a], [, b]) => Number(b) - Number(a))[0];
                const flags = violationCounts[i.id] ?? 0;
                return (
                  <tr key={i.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-5 py-4 font-mono text-xs">#{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{profile?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{ROLE_META[i.role as InterviewRole].short}</td>
                    <td className="px-5 py-4">
                      {top ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">
                          {top[0].replace(/_/g, " ")} · {Number(top[1]).toFixed(0)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {flags > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-0.5 text-xs font-medium text-destructive">
                          <ShieldAlert className="h-3 w-3" /> {flags}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clean</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-display text-xl font-bold">{Number(i.overall_score ?? 0).toFixed(0)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link to="/feedback/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
