import { BILLING_PLANS } from "../config/billing";
import type { CheckoutResponse, PlanCode } from "../types/billing";
import { browserApi } from "./browserApi";
import { supabase } from "./supabase";

export function isPlanCode(value: string): value is PlanCode {
  return BILLING_PLANS.some((plan) => plan.plan_code === value);
}

export async function createDodoCheckout(
  planCode: PlanCode,
): Promise<CheckoutResponse> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
    "create-dodo-checkout",
    {
      body: {
        plan_code: planCode,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to create checkout session.");
  }

  if (!data?.checkout_url || !data.session_id || data.plan_code !== planCode) {
    throw new Error("Checkout session response was incomplete.");
  }

  return data;
}

export async function openCheckoutUrl(url: string) {
  const tabs = browserApi.tabs();
  if (tabs?.create) {
    await new Promise<void>((resolve, reject) => {
      tabs.create({ url }, () => {
        const lastError = chrome.runtime?.lastError;
        if (lastError?.message) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
