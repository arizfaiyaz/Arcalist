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
  status: "active" | "inactive" | "cancelled" | string | null;
  source: "dodo" | "internal" | "manual" | string | null;
  reason?: string | null;
  updated_at?: string | null;
};

export type CheckoutResponse = {
  checkout_url: string;
  session_id: string;
  plan_code: PlanCode;
};
