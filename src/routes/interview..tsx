import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { VideoMonitor } from "@/components/interview/VideoMonitor";
import { AnswerInput } from "@/components/interview/AnswerInput";
import { ViolationBanner } from "@/components/interview/ViolationBanner";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, ShieldAlert, Clock, ArrowRight, Flag } from "lucide-react";
import { ROLE_META, VIOLATION_LABEL, type Question, type ViolationType } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/interview/")({
  component: InterviewRoom,
  head: () => ({ meta: [{ title: "Interview in progress — Lucid" }] }),
});

function InterviewRoom() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [method, setMethod] = useState<"text" | "voice">("text");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [violation, setViolation] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  if (!authLoading && !user) setTimeout(() => nav({ to: "/auth" }), 0);

  const { data: interview, isLoading } = useQuery({
    queryKey: ["interview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("interviews").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const questions: Question[] = (interview?.questions as any) ?? [];
  const current = questions[idx];

  // timer
  useEffect(() => {
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  // violation logger
  async function logViolation(type: ViolationType, details?: string) {
    if (!user) return;
    setViolation(VIOLATION_LABEL[type]);
    setViolationCount((c) => c + 1);
    await supabase.from("violations").insert({
      interview_id: id, user_id: user.id, type, details: details ?? null,
    });
  }

  // tab/window violations
  useEffect(() => {
    if (!interview) return;
    function onVis() { if (document.hidden) logViolation("tab_switch"); }
    function onBlur() { logViolation("window_blur"); }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [interview]);

  async function submitAnswer() {
    if (!current || !user || !answer.trim()) {
      toast.error("Please enter an answer");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-answer", {
        body: { question: current.question, answer, role: interview!.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.from("answers").insert({
        interview_id: id,
        user_id: user.id,
        question_index: idx,
        question_text: current.question,
        answer_text: answer,
        input_method: method,
        score: data.score,
        correctness: data.correctness,
        clarity: data.clarity,
        reasoning: data.reasoning,
        depth: data.depth,
        feedback: data.feedback,
        missing_concepts: data.missing_concepts,
        improvements: data.improvements,
      });

      if (idx + 1 < questions.length) {
        setIdx(idx + 1);
        setAnswer("");
      } else {
        await finish();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  async function finish() {
    setFinishing(true);
    try {
      const { data: rows } = await supabase.from("answers").select("*").eq("interview_id", id).order("question_index");
      const payload = (rows ?? []).map((r: any) => ({
        question: r.question_text, answer: r.answer_text,
        correctness: r.correctness, clarity: r.clarity, reasoning: r.reasoning, depth: r.depth, score: r.score,
      }));
      const { data: summary, error } = await supabase.functions.invoke("evaluate-interview", {
        body: { role: interview!.role, answers: payload },
      });
      if (error) throw error;
      if (summary?.error) throw new Error(summary.error);

      await supabase.from("interviews").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        overall_score: summary.overall_score,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        skill_scores: summary.skill_scores,
      }).eq("id", id);

      nav({ to: "/feedback/$id", params: { id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to finalize");
      setFinishing(false);
    }
  }

  if (isLoading || !interview) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const meta = ROLE_META[interview.role as keyof typeof ROLE_META];
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="relative min-h-screen bg-background">
      <ViolationBanner message={violation} onDismiss={() => setViolation(null)} />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Brain className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold">{meta.short} Interview</span>
              <span className="text-[11px] text-muted-foreground">Question {idx + 1} of {questions.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden items-center gap-1.5 font-mono text-muted-foreground sm:flex">
              <Clock className="h-3.5 w-3.5" /> {mins}:{secs}
            </div>
            <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${violationCount > 0 ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"}`}>
              <ShieldAlert className="h-3 w-3" /> {violationCount} flag{violationCount !== 1 && "s"}
            </div>
          </div>
        </div>
        {/* progress */}
        <div className="h-0.5 bg-muted">
          <div className="h-full bg-foreground transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {current && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5">{current.topic}</span>
                  <span>·</span>
                  <span className="capitalize">{current.difficulty}</span>
                </div>
                <h2 className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
                  {current.question}
                </h2>
              </div>

              <AnswerInput value={answer} onChange={setAnswer} onMethod={setMethod} />

              <div className="flex items-center justify-between border-t border-border pt-5">
                <Button variant="ghost" onClick={() => logViolation("suspicious", "Manual flag")}>
                  <Flag className="mr-1.5 h-4 w-4" /> Report issue
                </Button>
                <Button onClick={submitAnswer} disabled={submitting || finishing} size="lg" className="h-11 px-6">
                  {submitting || finishing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {finishing ? "Finalizing…" : "Evaluating…"}</>
                  ) : (
                    <>{idx + 1 === questions.length ? "Finish interview" : "Next question"} <ArrowRight className="ml-1.5 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <VideoMonitor enabled onViolation={(t) => logViolation(t)} />
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Stay focused.</p>
            <p className="mt-1 leading-relaxed">Switching tabs, looking away, or other faces in frame will be flagged for the recruiter.</p>
          </div>
          <div className="space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${i === idx ? "bg-foreground text-background" : i < idx ? "bg-muted text-muted-foreground" : "text-muted-foreground"}`}>
                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate">{q.topic}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
