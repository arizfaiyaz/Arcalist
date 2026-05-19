import {
  getEntitlementForUserId,
  isProEntitlement,
  type PlanSource,
} from "./entitlements";
import type { PlanName } from "./planLimits";
import { supabase } from "./supabase";

export type ResolvedPlanStatus = {
  isProUser: boolean;
  planName: PlanName;
  planSource: PlanSource;
  updatedAt: string;
};

export const DEFAULT_PLAN_STATUS: ResolvedPlanStatus = {
  isProUser: false,
  planName: "free",
  planSource: "default_free",
  updatedAt: new Date().toISOString(),
};

function getDevOverridePlan(): ResolvedPlanStatus | null {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_DEV_PRO === "true"
  ) {
    return {
      isProUser: true,
      planName: "pro",
      planSource: "dev_override",
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function resolvePlanForUserId(
  userId?: string | null,
): Promise<ResolvedPlanStatus> {
  const devOverride = getDevOverridePlan();
  if (devOverride) return devOverride;

  if (!userId) {
    return {
      ...DEFAULT_PLAN_STATUS,
      updatedAt: new Date().toISOString(),
    };
  }

  const entitlement = await getEntitlementForUserId(userId);
  const isProUser = isProEntitlement(entitlement);
  return {
    isProUser,
    planName: isProUser ? "pro" : "free",
    planSource: isProUser ? (entitlement?.source ?? "manual") : "default_free",
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveAuthenticatedPlanStatus(
  expectedUserId?: string | null,
): Promise<ResolvedPlanStatus> {
  const devOverride = getDevOverridePlan();
  if (devOverride) return devOverride;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user?.id || (expectedUserId && user.id !== expectedUserId)) {
    return {
      ...DEFAULT_PLAN_STATUS,
      updatedAt: new Date().toISOString(),
    };
  }

  return resolvePlanForUserId(user.id);
}
