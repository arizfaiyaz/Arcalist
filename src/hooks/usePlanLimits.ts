import { useMemo } from "react";
import { getPlanLimits } from "../lib/planLimits";
import { useEntitlementContext } from "./useEntitlement";

export function usePlanLimits() {
  const { isPro, loading, planSource, refreshEntitlement } =
    useEntitlementContext();

  return useMemo(
    () => ({
      ...getPlanLimits(isPro),
      loading,
      planSource,
      refreshPlan: refreshEntitlement,
    }),
    [isPro, loading, planSource, refreshEntitlement],
  );
}
