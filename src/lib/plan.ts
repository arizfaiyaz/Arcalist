import { getEntitlementForUserId, isProEntitlement } from "./entitlements";
import type { PlanName } from "./planLimits";
import { supabase } from "./supabase";

export type ResolvedPlanStatus = {
  isProUser: boolean;
  planName: PlanName;
  updatedAt: string;
};

export const DEFAULT_PLAN_STATUS: ResolvedPlanStatus = {
  isProUser: false,
  planName: "free",
  updatedAt: new Date().toISOString(),
};

export async function resolvePlanForUserId(
  userId?: string | null,
): Promise<ResolvedPlanStatus> {
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
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveAuthenticatedPlanStatus(
  expectedUserId?: string | null,
): Promise<ResolvedPlanStatus> {
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
