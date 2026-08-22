import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const FabVisibilityContext = createContext<{
  blocked: boolean;
  acquire: () => () => void;
} | null>(null);

/** Lets any form/wizard tell the create + button to get out of the way. */
export function FabVisibilityProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const acquire = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);

  return (
    <FabVisibilityContext.Provider value={{ blocked: count > 0, acquire }}>
      {children}
    </FabVisibilityContext.Provider>
  );
}

export function useCreateFabBlocked() {
  return useContext(FabVisibilityContext)?.blocked ?? false;
}

/** Hide the create + while this component is mounted (or while `active`). */
export function useOccupyCreateFab(active = true) {
  const ctx = useContext(FabVisibilityContext);
  useEffect(() => {
    if (!active || !ctx) return;
    return ctx.acquire();
  }, [active, ctx]);
}
