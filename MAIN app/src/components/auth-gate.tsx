import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand";
import { isAuthenticated } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthed(ok);
    setReady(true);
    if (!ok && pathname !== "/login") {
      void navigate({ to: "/login", replace: true });
    }
  }, [pathname, navigate]);

  if (!ready || !authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <BrandLogo size={48} className="rounded-2xl" />
      </div>
    );
  }

  return children;
}
