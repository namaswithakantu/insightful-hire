import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Eye, ShieldCheck, BarChart3, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Lucid — Explainable AI Interviews & Hiring" },
      { name: "description", content: "Conduct fair, transparent technical interviews with AI-generated questions, real-time monitoring, and explainable scoring." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explainable AI evaluation engine</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              Interviews you can <span className="italic font-normal">actually</span> trust.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Adaptive AI-generated questions, real-time integrity monitoring, and transparent scoring breakdowns —
              built for fair hiring.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-sm">
                <Link to="/auth" search={{ mode: "signup" } as any}>
                  Start free interview <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-xs text-muted-foreground">
              {["No setup", "Camera monitored", "Explainable scores", "Voice or text"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-border md:grid-cols-3">
          {[
            { icon: Brain, title: "Adaptive AI questions", body: "Role-specific, difficulty-aware questions generated for SDE, Data Analyst, and ML Engineer paths." },
            { icon: Eye, title: "Real-time monitoring", body: "Camera-based proctoring with face detection, gaze tracking, and tab-switch alerts." },
            { icon: ShieldCheck, title: "Explainable scoring", body: "Every score broken down into correctness, clarity, reasoning, and depth — with the why." },
            { icon: BarChart3, title: "Skill heatmaps", body: "Visualize growth, gaps, and trajectory across attempts with timeline analytics." },
            { icon: Users, title: "Recruiter mode", body: "Compare candidates side-by-side with structured rankings and integrity flags." },
            { icon: Sparkles, title: "Voice or text", body: "Answer naturally — speak it or type it. We transcribe and evaluate either way." },
          ].map((f) => (
            <div key={f.title} className="bg-background p-8 transition-colors hover:bg-card">
              <f.icon className="h-6 w-6 text-foreground" strokeWidth={1.75} />
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Hire with confidence. Practice with clarity.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join the candidates and recruiters using Lucid to make interviews transparent.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-8">
            <Link to="/auth" search={{ mode: "signup" } as any}>Create your account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <span>© Lucid — Explainable AI Interviews</span>
          <span>Built for fair, structured hiring.</span>
        </div>
      </footer>
    </div>
  );
}
