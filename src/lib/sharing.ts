import { supabase } from "./supabase";
import { normalizeSafeUrl } from "./urlSafety";
import type { Page } from "../types";
import type {
  PublicSharedPage,
  SharedPageRecord,
  SharedPageSnapshot,
} from "../types/sharing";

const DEFAULT_SHARE_BASE_URL = "https://arcalist.app";

type ShareParams = {
  userId: string;
  page: Page;
  baseUrl?: string;
};

type ShareLookupParams = {
  userId: string;
  pageId: string;
};

type ShareMutationParams = {
  userId: string;
  shareId: string;
};

export function getShareBaseUrl(baseUrl?: string): string {
  return (
    baseUrl ||
    import.meta.env.VITE_PUBLIC_SHARE_BASE_URL ||
    DEFAULT_SHARE_BASE_URL
  ).replace(/\/+$/, "");
}

export function buildShareUrl(shareToken: string, baseUrl?: string): string {
  return `${getShareBaseUrl(baseUrl)}/share/${shareToken}`;
}

export function generateShareToken(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) {
    return `sp_${webCrypto.randomUUID().replace(/-/g, "")}`;
  }

  const bytes = new Uint8Array(24);
  webCrypto.getRandomValues(bytes);
  return `sp_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function buildSharedPageSnapshot(page: Page): SharedPageSnapshot {
  return {
    version: 1,
    page: {
      id: page.id,
      title: page.title,
    },
    boards: [...(page.boards ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((board) => ({
        id: board.id,
        title: board.title,
        order: board.order,
        bookmarks: [...(board.bookmarks ?? [])]
          .filter((bookmark) => !bookmark.isTrashed && normalizeSafeUrl(bookmark.url))
          .map((bookmark, index) => ({
            id: bookmark.id,
            title: bookmark.title,
            url: normalizeSafeUrl(bookmark.url) ?? "",
            favicon: normalizeSafeUrl(bookmark.favicon ?? "") ?? undefined,
            faviconUrl: normalizeSafeUrl(bookmark.faviconUrl ?? "") ?? undefined,
            order: index,
          })),
      })),
  };
}

export async function getShareForPage({
  userId,
  pageId,
}: ShareLookupParams): Promise<SharedPageRecord | null> {
  const { data, error } = await supabase
    .from("shared_pages")
    .select("*")
    .eq("owner_id", userId)
    .eq("page_id", pageId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as SharedPageRecord | null) ?? null;
}

export async function createPageShare({
  userId,
  page,
  baseUrl,
}: ShareParams): Promise<{ share: SharedPageRecord; shareUrl: string }> {
  const shareToken = generateShareToken();
  const snapshot = buildSharedPageSnapshot(page);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("shared_pages")
    .insert({
      owner_id: userId,
      page_id: page.id,
      share_token: shareToken,
      title: page.title,
      snapshot,
      is_active: true,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;

  const share = data as SharedPageRecord;
  return {
    share,
    shareUrl: buildShareUrl(share.share_token, baseUrl),
  };
}

export async function updatePageShareSnapshot({
  userId,
  pageId,
  shareId,
  snapshot,
}: ShareMutationParams & {
  pageId: string;
  snapshot: SharedPageSnapshot;
}): Promise<SharedPageRecord> {
  const { data, error } = await supabase
    .from("shared_pages")
    .update({
      title: snapshot.page.title,
      snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shareId)
    .eq("owner_id", userId)
    .eq("page_id", pageId)
    .select("*")
    .single();

  if (error) throw error;
  return data as SharedPageRecord;
}

export async function revokePageShare({
  userId,
  shareId,
}: ShareMutationParams): Promise<void> {
  const { error } = await supabase
    .from("shared_pages")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shareId)
    .eq("owner_id", userId);

  if (error) throw error;
}

export async function regeneratePageShare({
  userId,
  page,
  oldShareId,
  baseUrl,
}: ShareParams & {
  oldShareId: string;
}): Promise<{ share: SharedPageRecord; shareUrl: string }> {
  await revokePageShare({ userId, shareId: oldShareId });
  return createPageShare({ userId, page, baseUrl });
}

export async function fetchPublicSharedPage(
  shareToken: string,
): Promise<PublicSharedPage | null> {
  const { data, error } = await supabase.rpc("get_shared_page_by_token", {
    p_share_token: shareToken,
  });

  if (error) throw error;
  const rows = data as PublicSharedPage[] | PublicSharedPage | null;
  if (Array.isArray(rows)) return rows[0] ?? null;
  return rows ?? null;
}
