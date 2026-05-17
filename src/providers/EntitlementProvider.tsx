import { useEffect, type PropsWithChildren } from "react";
import { EntitlementContext, useEntitlement } from "../hooks/useEntitlement";
import { useArcalistStore } from "../store/useArcalistStore";
import { setPlanStatus } from "../lib/sync/syncStorage";

export function EntitlementProvider({ children }: PropsWithChildren) {
  const entitlementState = useEntitlement();
  const setVerifiedPlanStatus = useArcalistStore(
    (state) => state.setVerifiedPlanStatus,
  );

  useEffect(() => {
    setVerifiedPlanStatus(
      entitlementState.isPro,
      entitlementState.plan,
      !entitlementState.loading,
    );
    void setPlanStatus(entitlementState.isPro, entitlementState.plan);
  }, [
    entitlementState.isPro,
    entitlementState.loading,
    entitlementState.plan,
    setVerifiedPlanStatus,
  ]);

  return (
    <EntitlementContext.Provider value={entitlementState}>
      {children}
    </EntitlementContext.Provider>
  );
}
