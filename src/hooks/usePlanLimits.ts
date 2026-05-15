import { useMemo } from "react";
import { getPlanLimits } from "../lib/planLimits";
import { useEntitlementContext } from "../providers/EntitlementProvider";

export function usePlanLimits() {
  const { isPro } = useEntitlementContext();

  return useMemo(() => getPlanLimits(isPro), [isPro]);
}
