import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const FabVisibilityContext = createContext<{
  blocked: boolean;
  acquire: () => () => void;
} | null>(null);

/** Lets any form/wizard/sheet tell the mobile create (+) button to get out of the way. */
export function FabVisibilityProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const acquire = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);
  const value = useMemo(() => ({ blocked: count > 0, acquire }), [count, acquire]);

  return <FabVisibilityContext.Provider value={value}>{children}</FabVisibilityContext.Provider>;
}

export function useCreateFabBlocked() {
  return useContext(FabVisibilityContext)?.blocked ?? false;
}

/** Hide the create (+) while this component is mounted (or while `active`). No-op without a provider. */
export function useOccupyCreateFab(active = true) {
  const acquire = useContext(FabVisibilityContext)?.acquire;
  useEffect(() => {
    if (!active || !acquire) return;
    return acquire();
  }, [active, acquire]);
}
