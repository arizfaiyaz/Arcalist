export type SmartCollectionId =
  | "recently-added"
  | "most-visited"
  | "unsorted"
  | "duplicates"
  | "by-domain"
  | "developer-tools"
  | "social-media"
  | "reading-list";

export type SmartCollectionDefinition = {
  id: SmartCollectionId;
  name: string;
  description: string;
  icon?: string;
  tier: "pro";
};

export const SMART_COLLECTION_DEFINITIONS: SmartCollectionDefinition[] = [
  {
    id: "recently-added",
    name: "Recently Added",
    description: "Newest bookmarks across every page and board.",
    icon: "Clock",
    tier: "pro",
  },
  {
    id: "most-visited",
    name: "Most Visited",
    description: "Bookmarks opened most often from Arcalist.",
    icon: "Flame",
    tier: "pro",
  },
  {
    id: "unsorted",
    name: "Unsorted",
    description: "Inbox, Later, Read Later, and untitled bookmarks.",
    icon: "Archive",
    tier: "pro",
  },
  {
    id: "duplicates",
    name: "Duplicate Links",
    description: "Same links saved in multiple places, grouped safely.",
    icon: "Copy",
    tier: "pro",
  },
  {
    id: "by-domain",
    name: "By Domain",
    description: "Top domains grouped by bookmark count.",
    icon: "Globe",
    tier: "pro",
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    description: "Docs, APIs, repositories, hosting, and dev resources.",
    icon: "Code",
    tier: "pro",
  },
  {
    id: "social-media",
    name: "Social & Media",
    description: "Social networks, communities, video, and audio links.",
    icon: "Share2",
    tier: "pro",
  },
  {
    id: "reading-list",
    name: "Reading List",
    description: "Articles, blogs, news, and read-later boards.",
    icon: "BookOpen",
    tier: "pro",
  },
];
