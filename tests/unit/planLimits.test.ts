import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  getLockedBoardCountForPlan,
  getLockedPageCountForPlan,
  getUserPlanLimits,
  getVisiblePagesForPlan,
  normalizeWorkspaceState,
} from "../../src/lib/planLimits";
import type { ArcalistState, Board, Page } from "../../src/types";
import { createBaseState } from "../utils/testState";

const createBoard = (index: number): Board => ({
  id: `board-${index}`,
  title: `Board ${index}`,
  order: index,
  bookmarks: [],
});

const createPage = (index: number, boardCount = 0): Page => ({
  id: `page-${index}`,
  title: `Page ${index}`,
  order: index,
  boards: Array.from({ length: boardCount }, (_, boardIndex) =>
    createBoard(index * 100 + boardIndex),
  ),
});

describe("plan limits", () => {
  it("limits free users to three visible pages and ten visible boards", () => {
    const state = createBaseState({
      pages: Array.from({ length: 5 }, (_, index) => createPage(index, 12)),
    });
    const limits = getUserPlanLimits(null);
    const visiblePages = getVisiblePagesForPlan(state.pages, limits);

    expect(visiblePages).toHaveLength(3);
    expect(visiblePages[0].boards).toHaveLength(10);
    expect(getLockedPageCountForPlan(state.pages, limits)).toBe(2);
    expect(getLockedBoardCountForPlan(state.pages[0], limits)).toBe(2);
  });

  it("allows pro users to see and create beyond free limits", () => {
    const proUser = {
      user_metadata: { plan: "pro" },
      app_metadata: {},
    } as User;
    const state = createBaseState({
      pages: Array.from({ length: 5 }, (_, index) => createPage(index, 12)),
    });
    const limits = getUserPlanLimits(proUser);
    const visiblePages = getVisiblePagesForPlan(state.pages, limits);

    expect(limits.isProUser).toBe(true);
    expect(limits.canCreatePage(25)).toBe(true);
    expect(limits.canCreateBoard(40)).toBe(true);
    expect(visiblePages).toHaveLength(5);
    expect(visiblePages[0].boards).toHaveLength(12);
  });

  it("normalizes loaded state without deleting over-limit pages or boards", () => {
    const state = createBaseState({
      pages: Array.from({ length: 4 }, (_, index) => createPage(index, 11)),
    });

    const normalized = normalizeWorkspaceState(state);

    expect(normalized.pages).toHaveLength(4);
    expect(normalized.pages[0].boards).toHaveLength(11);
    expect(normalized.overflowBoards).toEqual([]);
  });

  it("recovers legacy overflow boards into pages so pro can reveal them later", () => {
    const state: ArcalistState = createBaseState({
      pages: [createPage(0, 1)],
      overflowBoards: [
        {
          board: createBoard(99),
          fromPageId: "page-4",
          fromPageTitle: "Imported extras",
        },
      ],
    });

    const normalized = normalizeWorkspaceState(state);

    expect(normalized.overflowBoards).toEqual([]);
    expect(normalized.pages).toHaveLength(2);
    expect(normalized.pages[1].title).toBe("Imported extras");
    expect(normalized.pages[1].boards[0].id).toBe("board-99");
  });
});

