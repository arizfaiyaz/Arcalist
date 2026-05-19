export type PlanCode = "pro_monthly" | "pro_yearly";

export type BillingPlan = {
  plan_code: PlanCode;
  displayName: string;
  displayPrice: string;
  priceUsd?: number;
  annualPriceUsd?: number;
  monthlyEquivalentUsd?: number;
  badge?: string;
};

export type Entitlement = {
  plan: "free" | "pro" | string | null;
  is_pro: boolean | null;
  source: "dev_override" | "dodo_subscription" | "default_free" | string | null;
  dodo_subscription_id?: string | null;
  valid_until: string | null;
  status?: string | null;
};

export type CheckoutResponse = {
  checkout_url: string;
  session_id: string;
  plan_code: PlanCode;
};
