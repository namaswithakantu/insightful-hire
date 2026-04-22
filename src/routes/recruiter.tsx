import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert, Trophy, Users, ArrowRight, Search, GitCompare, TrendingUp, Calendar } from "lucide-react";
import { ROLE_META, type InterviewRole } from "@/lib/types";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/recruiter")({
  component: RecruiterPage,
  head: () => ({ meta: [{ title: "Recruiter — Lucid" }] }),
});

type SortKey = "score" | "recent" | "name";

function RecruiterPage() {
  const { user, isRecruiter, loading } = useAuth();
  const nav = useNavigate();
  const [filterRole, setFilterRole] = useState<InterviewRole | "all">("all");
  const [minScore, setMinScore] = useState(0);
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!loading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-data"],
    queryFn: async () => {
      const [interviewsRes, profilesRes, violationsRes, decisionsRes] = await Promise.all([
        supabase.from("interviews").select("*").eq("status", "completed"),
        supabase.from("profiles").select("*"),
        supabase.from("violations").select("interview_id"),
        supabase.from("hiring_decisions").select("interview_id, recommendation"),
      ]);
      return {
        interviews: interviewsRes.data ?? [],
        profiles: profilesRes.data ?? [],
        violationCounts: (violationsRes.data ?? []).reduce((acc: Record<string, number>, v: any) => {
          acc[v.interview_id] = (acc[v.interview_id] ?? 0) + 1;
          return acc;
        }, {}),
        decisions: Object.fromEntries((decisionsRes.data ?? []).map((d: any) => [d.interview_id, d.recommendation])),
      };
    },
    enabled: !!user && isRecruiter,
  });

  const interviews = data?.interviews ?? [];
  const profileById = Object.fromEntries((data?.profiles ?? []).map((p: any) => [p.id, p]));
  const violationCounts = data?.violationCounts ?? {};
  const decisions = data?.decisions ?? {};

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    interviews.forEach((i: any) => Object.keys(i.skill_scores ?? {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [interviews]);

  const filtered = useMemo(() => {
    let list = interviews;
    if (filterRole !== "all") list = list.filter((i: any) => i.role === filterRole);
    if (minScore > 0) list = list.filter((i: any) => Number(i.overall_score ?? 0) >= minScore);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i: any) => {
        const p = profileById[i.user_id];
        return p?.full_name?.toLowerCase().includes(q) || p?.email?.toLowerCase().includes(q);
      });
    }
    if (sortBy === "score") {
      list = [...list].sort((a, b) => Number(b.overall_score ?? 0) - Number(a.overall_score ?? 0));
    } else if (sortBy === "recent") {
      list = [...list].sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime());
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => (profileById[a.user_id]?.full_name ?? "").localeCompare(profileById[b.user_id]?.full_name ?? ""));
    } else if (skillFilter !== "all") {
      list = [...list].sort((a, b) => Number((b.skill_scores ?? {})[skillFilter] ?? 0) - Number((a.skill_scores ?? {})[skillFilter] ?? 0));
    }
    return list;
  }, [interviews, filterRole, minScore, search, sortBy, skillFilter, profileById]);

  const skillDistribution = useMemo(() => {
    const acc: Record<string, number[]> = {};
    filtered.forEach((i: any) => {
      Object.entries(i.skill_scores ?? {}).forEach(([k, v]: any) => {
        acc[k] = acc[k] || [];
        acc[k].push(Number(v));
      });
    });
    return Object.entries(acc).map(([k, arr]) => ({
      skill: k.replace(/_/g, " "),
      avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    }));
  }, [filtered]);

  const funnel = useMemo(() => {
    const totalApplied = new Set(interviews.map((i: any) => i.user_id)).size;
    const interviewed = new Set(interviews.map((i: any) => i.user_id)).size;
    const recommendedHire = Object.values(decisions).filter((r) => r === "strong_hire").length;
    return { totalApplied, interviewed, recommendedHire };
  }, [interviews, decisions]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

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
            Sign up with a recruiter account to view this dashboard, or ask an admin to grant the recruiter role.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Recruiter signup</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const avgScore = filtered.length
    ? filtered.reduce((s: number, i: any) => s + Number(i.overall_score ?? 0), 0) / filtered.length
    : 0;

  const recBadge = (rec?: string) => {
    if (rec === "strong_hire") return <span className="rounded-md border border-foreground bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">Strong Hire</span>;
    if (rec === "consider") return <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Consider</span>;
    if (rec === "reject") return <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">Reject</span>;
    return <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Recruiter mode</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Hiring dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Compare candidates with structured, explainable scores.</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size >= 2 && (
              <Button asChild>
                <Link to="/recruiter/compare" search={{ ids: Array.from(selected).join(",") }}>
                  <GitCompare className="mr-1.5 h-4 w-4" /> Compare ({selected.size})
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Candidates", value: new Set(filtered.map((i: any) => i.user_id)).size, sub: "Unique" },
            { icon: Trophy, label: "Avg score", value: avgScore.toFixed(0), sub: "Across filter" },
            { icon: TrendingUp, label: "Strong hires", value: funnel.recommendedHire, sub: "Total" },
            { icon: ShieldAlert, label: "Flagged", value: filtered.filter((i: any) => violationCounts[i.id] > 0).length, sub: "With violations" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 font-display text-3xl font-bold">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Skill distribution</h2>
            <p className="text-xs text-muted-foreground">Average skill scores across filtered candidates</p>
            <div className="mt-5 h-64">
              {skillDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillDistribution} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid stroke="oklch(0.92 0 0)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="skill" tick={{ fontSize: 10, fill: "oklch(0.45 0 0)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "oklch(0.45 0 0)" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "oklch(0.96 0 0)" }} contentStyle={{ background: "oklch(0.12 0 0)", border: "none", borderRadius: 8, color: "white", fontSize: 12 }} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {skillDistribution.map((_, idx) => <Cell key={idx} fill="oklch(0.12 0 0)" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for this filter.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Hiring funnel</h2>
            <p className="text-xs text-muted-foreground">Pipeline overview</p>
            <div className="mt-5 space-y-4">
              {[
                { label: "Applied", value: funnel.totalApplied, pct: 100 },
                { label: "Interviewed", value: funnel.interviewed, pct: funnel.totalApplied ? (funnel.interviewed / funnel.totalApplied) * 100 : 0 },
                { label: "Strong Hire", value: funnel.recommendedHire, pct: funnel.totalApplied ? (funnel.recommendedHire / funnel.totalApplied) * 100 : 0 },
              ].map((s, i) => (
                <div key={s.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium">{s.label}</span>
                    <span className="font-mono text-muted-foreground">{s.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${Math.max(s.pct, 4)}%`, opacity: 1 - i * 0.15 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidate by name or email…" className="pl-9" />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
            {(["all", "sde", "data_analyst", "ml_engineer"] as const).map((r) => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterRole === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {r === "all" ? "All roles" : ROLE_META[r].short}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium">
            <option value="score">Highest score</option>
            <option value="recent">Most recent</option>
            <option value="name">Name A→Z</option>
          </select>
          <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium">
            <option value="all">Best in skill…</option>
            {allSkills.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Min score</span>
            <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-foreground" />
            <span className="font-mono w-6">{minScore}</span>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-5 py-3 text-left">Rank</th>
                <th className="px-5 py-3 text-left">Candidate</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Top skill</th>
                <th className="px-5 py-3 text-left">Decision</th>
                <th className="px-5 py-3 text-left">Flags</th>
                <th className="px-5 py-3 text-right">Score</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-sm text-muted-foreground">No candidates match these filters.</td></tr>
              )}
              {filtered.map((i: any, idx: number) => {
                const profile = profileById[i.user_id];
                const skills = (i.skill_scores as Record<string, number>) ?? {};
                const top = Object.entries(skills).sort(([, a], [, b]) => Number(b) - Number(a))[0];
                const flags = violationCounts[i.id] ?? 0;
                const checked = selected.has(i.id);
                return (
                  <tr key={i.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(i.id)}
                        disabled={!checked && selected.size >= 4}
                        className="h-4 w-4 cursor-pointer accent-foreground"
                      />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">#{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{profile?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{profile?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{ROLE_META[i.role as InterviewRole].short}</td>
                    <td className="px-5 py-4 text-muted-foreground"><span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(i.completed_at ?? i.created_at).toLocaleDateString()}</span></td>
                    <td className="px-5 py-4">
                      {top ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs capitalize">
                          {top[0].replace(/_/g, " ")} · {Number(top[1]).toFixed(0)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4">{recBadge(decisions[i.id])}</td>
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
                      <Link to="/recruiter/candidate/$id" params={{ id: i.id }} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">
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