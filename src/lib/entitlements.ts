import { supabase } from "./supabase";
import type { Entitlement } from "../types/billing";

export type UserEntitlement = Entitlement;

export type PlanSource =
  | "dev_override"
  | "default_free"
  | "dodo"
  | "internal"
  | "manual"
  | string;

export function isProEntitlement(
  entitlement: UserEntitlement | null | undefined,
) {
  return entitlement?.plan === "pro" && entitlement?.status === "active";
}

export async function getEntitlementForUserId(
  userId: string,
): Promise<UserEntitlement | null> {
  try {
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("user_id,plan,status,source,reason,updated_at")
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
