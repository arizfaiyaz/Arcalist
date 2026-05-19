import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getCurrentUserEntitlement,
  isProEntitlement,
  type PlanSource,
  type UserEntitlement,
} from "../lib/entitlements";
import type { PlanName } from "../lib/planLimits";

export type EntitlementHookState = {
  entitlement: UserEntitlement | null;
  loading: boolean;
  isPro: boolean;
  plan: PlanName;
  planSource: PlanSource;
  refreshEntitlement: () => Promise<UserEntitlement | null>;
};

export const EntitlementContext = createContext<EntitlementHookState | null>(null);

export function useEntitlementContext() {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error("useEntitlementContext must be used within EntitlementProvider");
  }
  return context;
}

export function useEntitlement(): EntitlementHookState {
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const devOverride =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PRO === "true";

  const refreshEntitlement = useCallback(async () => {
    if (devOverride) {
      setEntitlement(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const nextEntitlement = await getCurrentUserEntitlement();
    setEntitlement(nextEntitlement);
    setLoading(false);
    return nextEntitlement;
  }, [devOverride]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (devOverride) {
        if (!active) return;
        setEntitlement(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextEntitlement = await getCurrentUserEntitlement();
      if (!active) return;
      setEntitlement(nextEntitlement);
      setLoading(false);
    };

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [devOverride]);

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshEntitlement();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [refreshEntitlement]);

  const isPro = devOverride || isProEntitlement(entitlement);
  const plan: PlanName = isPro ? "pro" : "free";
  const planSource: PlanSource = devOverride
    ? "dev_override"
    : isPro
      ? (entitlement?.source ?? "manual")
      : "default_free";

  return useMemo(
    () => ({
      entitlement,
      loading,
      isPro,
      plan,
      planSource,
      refreshEntitlement,
    }),
    [entitlement, isPro, loading, plan, planSource, refreshEntitlement],
  );
}
