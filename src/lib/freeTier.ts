import { FREE_PLAN } from "../config/plans";
import { normalizeWorkspaceState } from "./planLimits";
import type { ArcalistState, Page } from "../types";

export const FREE_TIER_LIMITS = {
  maxPages: FREE_PLAN.maxPages,
  maxBoardsPerPage: FREE_PLAN.maxBoardsPerPage,
  maxVisibleBoards: FREE_PLAN.maxPages * FREE_PLAN.maxBoardsPerPage,
};

export const canCreatePage = (pages: Page[], isProUser = false) => {
  if (isProUser) return true;
  return pages.length < FREE_PLAN.maxPages;
};

export const canCreateBoard = (page: Page | undefined, isProUser = false) => {
  if (isProUser) return true;
  return (page?.boards?.length ?? 0) < FREE_PLAN.maxBoardsPerPage;
};

// Kept as a compatibility export for older callers. Despite the legacy name,
// this now repairs malformed state without trimming over-limit pages or boards.
export const normalizeBoardsForFreeTier = (
  state: ArcalistState,
): ArcalistState => normalizeWorkspaceState(state);
