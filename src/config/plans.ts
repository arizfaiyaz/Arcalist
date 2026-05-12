export type PlanName = "free" | "pro";

export type PlanConfig = {
  name: PlanName;
  maxPages: number;
  maxBoardsPerPage: number;
};

export const FREE_PLAN: PlanConfig = {
  name: "free",
  maxPages: 3,
  maxBoardsPerPage: 10,
};

export const PRO_PLAN: PlanConfig = {
  name: "pro",
  maxPages: Infinity,
  maxBoardsPerPage: Infinity,
};

// Temporary development switch. Later this can be replaced by Supabase profile
// fields populated from Dodopayments subscription webhooks.
export const DEV_IS_PRO = false;

