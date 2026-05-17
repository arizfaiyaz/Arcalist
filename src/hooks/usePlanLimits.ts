import { useMemo } from "react";
import { getPlanLimits } from "../lib/planLimits";
import { useEntitlementContext } from "../providers/EntitlementProvider";

export function usePlanLimits() {
  const { isPro, loading } = useEntitlementContext();

  return useMemo(
    () => ({ ...getPlanLimits(isPro), loading }),
    [isPro, loading],
  );
}
