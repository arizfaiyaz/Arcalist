import { supabase } from "./supabase";

export type UserEntitlement = {
  plan: string | null;
  status: string | null;
  source: string | null;
};

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
      .select("plan,status,source")
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
