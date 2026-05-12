import { useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { getUserPlanLimits } from "../lib/planLimits";
import { useArcalistStore } from "../store/useArcalistStore";

export function usePlanLimits(userOverride?: User | null) {
  const storeUser = useArcalistStore((state) => state.user);
  const user = userOverride ?? storeUser;

  return useMemo(() => getUserPlanLimits(user), [user]);
}

