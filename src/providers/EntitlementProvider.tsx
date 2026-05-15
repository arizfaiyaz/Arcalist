import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from "react";
import { useEntitlement, type EntitlementHookState } from "../hooks/useEntitlement";
import { useArcalistStore } from "../store/useArcalistStore";
import { setPlanStatus } from "../lib/sync/syncStorage";

const EntitlementContext = createContext<EntitlementHookState | null>(null);

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

export function useEntitlementContext() {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error("useEntitlementContext must be used within EntitlementProvider");
  }
  return context;
}
