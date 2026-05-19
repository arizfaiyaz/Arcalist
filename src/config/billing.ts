import type { BillingPlan } from "../types/billing";

export const BILLING_PLANS: BillingPlan[] = [
  {
    plan_code: "pro_monthly",
    displayName: "Monthly",
    displayPrice: "$6.50/month",
    priceUsd: 6.5,
  },
  {
    plan_code: "pro_yearly",
    displayName: "Yearly",
    displayPrice: "$4.99/month billed yearly",
    annualPriceUsd: 59.88,
    monthlyEquivalentUsd: 4.99,
    badge: "Best value",
  },
];
