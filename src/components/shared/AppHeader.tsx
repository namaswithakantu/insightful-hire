import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, LayoutDashboard, Users } from "lucide-react";

export function AppHeader() {
  const { user, isRecruiter, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isInterview = path.startsWith("/interview");
  if (isInterview) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Brain className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight">Lucid</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Explainable AI</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {user && (
            <>
              <Link to="/dashboard" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" activeProps={{ className: "!text-foreground !bg-muted" }}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <Link to="/roles" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" activeProps={{ className: "!text-foreground !bg-muted" }}>
                New Interview
              </Link>
              {isRecruiter && (
                <Link to="/recruiter" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" activeProps={{ className: "!text-foreground !bg-muted" }}>
                  <Users className="h-4 w-4" /> Recruiter
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav({ to: "/auth" })}>Sign in</Button>
              <Button size="sm" onClick={() => nav({ to: "/auth", search: { mode: "signup" } as any })}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
