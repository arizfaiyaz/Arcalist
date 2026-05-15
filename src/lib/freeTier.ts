import {
  FREE_LIMITS,
  canCreateBoard as canCreateBoardForPlan,
  canCreatePage as canCreatePageForPlan,
  normalizeWorkspaceState,
} from "./planLimits";
import type { ArcalistState, Page } from "../types";

export const FREE_TIER_LIMITS = {
  maxPages: FREE_LIMITS.pages,
  maxBoardsPerPage: FREE_LIMITS.boardsPerPage,
  maxVisibleBoards: FREE_LIMITS.pages * FREE_LIMITS.boardsPerPage,
};

export const canCreatePage = (pages: Page[], isProUser = false) => {
  return canCreatePageForPlan(isProUser, pages.length);
};

export const canCreateBoard = (page: Page | undefined, isProUser = false) => {
  return canCreateBoardForPlan(isProUser, page?.boards?.length ?? 0);
};

// Kept as a compatibility export for older callers. Despite the legacy name,
// this now repairs malformed state without trimming over-limit pages or boards.
export const normalizeBoardsForFreeTier = (
  state: ArcalistState,
): ArcalistState => normalizeWorkspaceState(state);
