export type SharedPageSnapshot = {
  version: 1;
  page: {
    id: string;
    title: string;
  };
  boards: Array<{
    id: string;
    title: string;
    order: number;
    bookmarks: Array<{
      id: string;
      title: string;
      url: string;
      faviconUrl?: string;
      order: number;
    }>;
  }>;
};

export type SharedPageRecord = {
  id: string;
  owner_id: string;
  page_id: string;
  share_token: string;
  title: string;
  snapshot: SharedPageSnapshot;
  is_active: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string | null;
};

export type PublicSharedPage = {
  title: string;
  snapshot: SharedPageSnapshot;
  view_count: number;
  updated_at: string;
  last_viewed_at?: string | null;
};
