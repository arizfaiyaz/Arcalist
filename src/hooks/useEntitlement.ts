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
  type UserEntitlement,
} from "../lib/entitlements";
import type { PlanName } from "../lib/planLimits";

export type EntitlementHookState = {
  entitlement: UserEntitlement | null;
  loading: boolean;
  isPro: boolean;
  plan: PlanName;
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

  const refreshEntitlement = useCallback(async () => {
    setLoading(true);
    const nextEntitlement = await getCurrentUserEntitlement();
    setEntitlement(nextEntitlement);
    setLoading(false);
    return nextEntitlement;
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
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
  }, []);

  const isPro = isProEntitlement(entitlement);
  const plan: PlanName = isPro ? "pro" : "free";

  return useMemo(
    () => ({
      entitlement,
      loading,
      isPro,
      plan,
      refreshEntitlement,
    }),
    [entitlement, isPro, loading, plan, refreshEntitlement],
  );
}
