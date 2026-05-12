import {
  SMART_COLLECTION_DEFINITIONS,
  type SmartCollectionDefinition,
  type SmartCollectionId,
} from "../config/smartCollections";
import type { Bookmark, Page } from "../types";

export type BookmarkWithContext = {
  bookmark: Bookmark;
  bookmarkId: string;
  boardId: string;
  boardTitle: string;
  pageId: string;
  pageTitle: string;
};

export type SmartCollectionResult = {
  bookmarkId: string;
  pageId: string;
  boardId: string;
  pageTitle: string;
  boardTitle: string;
  title: string;
  url: string;
  favicon?: string;
  faviconUrl?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  lastVisitedAt?: string;
  visitCount?: number;
  description?: string;
};

export type DuplicateLinkGroup = {
  normalizedUrl: string;
  domain: string;
  bookmarks: SmartCollectionResult[];
};

export type DomainCollectionGroup = {
  domain: string;
  count: number;
  bookmarks: SmartCollectionResult[];
};

export type SmartCollection = SmartCollectionDefinition & {
  count: number;
  bookmarks: SmartCollectionResult[];
  duplicateGroups?: DuplicateLinkGroup[];
  domainGroups?: DomainCollectionGroup[];
  emptyState: string;
};

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
]);

const UNSORTED_BOARD_NAMES = new Set([
  "inbox",
  "unsorted",
  "later",
  "read later",
]);

const DEVELOPER_KEYWORDS = [
  "github",
  "stackoverflow",
  "stack overflow",
  "npm",
  "vercel",
  "netlify",
  "supabase",
  "firebase",
  "react",
  "nextjs",
  "next.js",
  "tailwind",
  "docs",
  "api",
  "developer",
];

const SOCIAL_MEDIA_KEYWORDS = [
  "youtube",
  "twitter",
  "x.com",
  "instagram",
  "reddit",
  "linkedin",
  "facebook",
  "discord",
  "spotify",
];

const READING_KEYWORDS = [
  "blog",
  "article",
  "news",
  "medium",
  "dev.to",
  "hashnode",
];

function parseUrl(url: string): URL | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function toResult(item: BookmarkWithContext): SmartCollectionResult {
  return {
    bookmarkId: item.bookmarkId,
    pageId: item.pageId,
    boardId: item.boardId,
    pageTitle: item.pageTitle,
    boardTitle: item.boardTitle,
    title: item.bookmark.title,
    url: item.bookmark.url,
    favicon: item.bookmark.favicon,
    faviconUrl: item.bookmark.faviconUrl,
    createdAt: item.bookmark.createdAt,
    updatedAt: item.bookmark.updatedAt,
    lastVisitedAt: item.bookmark.lastVisitedAt,
    visitCount: item.bookmark.visitCount ?? 0,
    description: item.bookmark.description,
  };
}

function timestampValue(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function matchesKeyword(item: BookmarkWithContext, keywords: string[]) {
  const haystack = [
    item.bookmark.title,
    item.bookmark.url,
    getDomainFromUrl(item.bookmark.url),
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function getAllBookmarksWithContext(
  pages: Page[],
): BookmarkWithContext[] {
  const results: BookmarkWithContext[] = [];
  for (const page of pages ?? []) {
    for (const board of page.boards ?? []) {
      for (const bookmark of board.bookmarks ?? []) {
        if (bookmark.isTrashed) continue;
        results.push({
          bookmark,
          bookmarkId: bookmark.id,
          boardId: board.id,
          boardTitle: board.title,
          pageId: page.id,
          pageTitle: page.title,
        });
      }
    }
  }
  return results;
}

export function normalizeUrl(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url.trim().toLowerCase();

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? `:${parsed.port}` : "";
  let pathname = parsed.pathname || "/";
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");

  const params = new URLSearchParams(parsed.search);
  for (const key of Array.from(params.keys())) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      params.delete(key);
    }
  }

  const query = Array.from(params.entries())
    .sort(([aKey, aValue], [bKey, bValue]) =>
      `${aKey}=${aValue}`.localeCompare(`${bKey}=${bValue}`),
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${hostname}${port}${normalizedPath}${query ? `?${query}` : ""}${parsed.hash}`;
}

export function getDomainFromUrl(url: string): string {
  return parseUrl(url)?.hostname.toLowerCase() ?? "";
}

export function buildRecentlyAddedCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return [...bookmarks]
    .sort(
      (a, b) =>
        timestampValue(b.bookmark.createdAt) - timestampValue(a.bookmark.createdAt),
    )
    .slice(0, 50)
    .map(toResult);
}

export function buildMostVisitedCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return [...bookmarks]
    .filter((item) => (item.bookmark.visitCount ?? 0) > 0)
    .sort((a, b) => {
      const visits = (b.bookmark.visitCount ?? 0) - (a.bookmark.visitCount ?? 0);
      if (visits !== 0) return visits;
      return (
        timestampValue(b.bookmark.lastVisitedAt) -
        timestampValue(a.bookmark.lastVisitedAt)
      );
    })
    .slice(0, 50)
    .map(toResult);
}

export function buildUnsortedCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return bookmarks
    .filter((item) => {
      const boardName = item.boardTitle.trim().toLowerCase();
      return (
        UNSORTED_BOARD_NAMES.has(boardName) || item.bookmark.title.trim() === ""
      );
    })
    .map(toResult);
}

export function buildDuplicateLinksCollection(
  bookmarks: BookmarkWithContext[],
): DuplicateLinkGroup[] {
  const grouped = new Map<string, BookmarkWithContext[]>();
  for (const item of bookmarks) {
    const normalized = normalizeUrl(item.bookmark.url);
    if (!normalized) continue;
    const group = grouped.get(normalized) ?? [];
    group.push(item);
    grouped.set(normalized, group);
  }

  return Array.from(grouped.entries())
    .filter(([, items]) => items.length > 1)
    .map(([normalizedUrl, items]) => ({
      normalizedUrl,
      domain: getDomainFromUrl(items[0]?.bookmark.url ?? "") || normalizedUrl,
      bookmarks: items.map(toResult),
    }))
    .sort((a, b) => b.bookmarks.length - a.bookmarks.length);
}

export function buildDomainCollections(
  bookmarks: BookmarkWithContext[],
): DomainCollectionGroup[] {
  const grouped = new Map<string, SmartCollectionResult[]>();
  for (const item of bookmarks) {
    const domain = getDomainFromUrl(item.bookmark.url);
    if (!domain) continue;
    const group = grouped.get(domain) ?? [];
    group.push(toResult(item));
    grouped.set(domain, group);
  }

  return Array.from(grouped.entries())
    .map(([domain, results]) => ({
      domain,
      count: results.length,
      bookmarks: results,
    }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    .slice(0, 25);
}

export function buildDeveloperToolsCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return bookmarks
    .filter((item) => matchesKeyword(item, DEVELOPER_KEYWORDS))
    .map(toResult);
}

export function buildSocialMediaCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return bookmarks
    .filter((item) => matchesKeyword(item, SOCIAL_MEDIA_KEYWORDS))
    .map(toResult);
}

export function buildReadingListCollection(
  bookmarks: BookmarkWithContext[],
): SmartCollectionResult[] {
  return bookmarks
    .filter((item) => {
      const boardName = item.boardTitle.toLowerCase();
      return (
        boardName.includes("read") ||
        boardName.includes("article") ||
        boardName.includes("blog") ||
        matchesKeyword(item, READING_KEYWORDS)
      );
    })
    .map(toResult);
}

export function buildSmartCollections(pages: Page[]): SmartCollection[] {
  const bookmarks = getAllBookmarksWithContext(pages);
  const recentlyAdded = buildRecentlyAddedCollection(bookmarks);
  const mostVisited = buildMostVisitedCollection(bookmarks);
  const unsorted = buildUnsortedCollection(bookmarks);
  const duplicateGroups = buildDuplicateLinksCollection(bookmarks);
  const domainGroups = buildDomainCollections(bookmarks);
  const developerTools = buildDeveloperToolsCollection(bookmarks);
  const socialMedia = buildSocialMediaCollection(bookmarks);
  const readingList = buildReadingListCollection(bookmarks);

  const collectionData: Record<
    SmartCollectionId,
    {
      bookmarks: SmartCollectionResult[];
      duplicateGroups?: DuplicateLinkGroup[];
      domainGroups?: DomainCollectionGroup[];
      emptyState: string;
    }
  > = {
    "recently-added": {
      bookmarks: recentlyAdded,
      emptyState: "No bookmarks yet.",
    },
    "most-visited": {
      bookmarks: mostVisited,
      emptyState: "Open bookmarks from Arcalist to build this collection.",
    },
    unsorted: {
      bookmarks: unsorted,
      emptyState: "No unsorted bookmarks found.",
    },
    duplicates: {
      bookmarks: duplicateGroups.flatMap((group) => group.bookmarks),
      duplicateGroups,
      emptyState: "No duplicate links found.",
    },
    "by-domain": {
      bookmarks: domainGroups.flatMap((group) => group.bookmarks),
      domainGroups,
      emptyState: "No bookmark domains found.",
    },
    "developer-tools": {
      bookmarks: developerTools,
      emptyState: "No developer tool bookmarks found.",
    },
    "social-media": {
      bookmarks: socialMedia,
      emptyState: "No social or media bookmarks found.",
    },
    "reading-list": {
      bookmarks: readingList,
      emptyState: "No reading list bookmarks found.",
    },
  };

  return SMART_COLLECTION_DEFINITIONS.map((definition) => {
    const data = collectionData[definition.id];
    return {
      ...definition,
      ...data,
      count:
        definition.id === "by-domain"
          ? data.domainGroups?.length ?? 0
          : data.bookmarks.length,
    };
  });
}
