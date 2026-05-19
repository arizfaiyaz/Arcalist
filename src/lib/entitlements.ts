import { supabase } from "./supabase";
import type { Entitlement } from "../types/billing";

export type UserEntitlement = Entitlement;

export type PlanSource = "dev_override" | "dodo_subscription" | "default_free";

export function isProEntitlement(
  entitlement: UserEntitlement | null | undefined,
) {
  if (entitlement?.plan !== "pro" || entitlement?.is_pro !== true) return false;
  if (!entitlement.valid_until) return true;

  const expiresAt = Date.parse(entitlement.valid_until);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function getEntitlementForUserId(
  userId: string,
): Promise<UserEntitlement | null> {
  try {
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("plan,is_pro,source,dodo_subscription_id,valid_until,status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[Arcalist] Entitlement lookup failed:", error.message);
      return null;
    }

    return (data as UserEntitlement | null) ?? null;
  } catch (error) {
    console.warn("[Arcalist] Entitlement lookup failed:", error);
    return null;
  }
}

export async function getCurrentUserEntitlement(): Promise<UserEntitlement | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) return null;
    return getEntitlementForUserId(user.id);
  } catch (error) {
    console.warn("[Arcalist] Current user entitlement lookup failed:", error);
    return null;
  }
}
