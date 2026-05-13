import { useMemo, useState } from "react";
import { ArrowUpRight, Pencil, Search, Trash2 } from "lucide-react";
import type {
  SmartCollection,
  SmartCollectionResult,
} from "../../lib/smartCollections";
import { getDomainFromUrl } from "../../lib/smartCollections";
import { useArcalistStore } from "../../store/useArcalistStore";
import { BookmarkEditModal } from "../BookmarkEditModal";
import { openSafeUrl } from "../../lib/urlSafety";

type Props = {
  collection: SmartCollection;
};

export function SmartCollectionResults({ collection }: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SmartCollectionResult | null>(null);

  const filteredBookmarks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collection.bookmarks;
    return collection.bookmarks.filter((bookmark) =>
      [
        bookmark.title,
        bookmark.url,
        bookmark.pageTitle,
        bookmark.boardTitle,
        getDomainFromUrl(bookmark.url),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [collection.bookmarks, query]);

  const filteredDuplicateGroups = useMemo(() => {
    const groups = collection.duplicateGroups ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        bookmarks: group.bookmarks.filter((bookmark) =>
          [bookmark.title, bookmark.url, bookmark.pageTitle, bookmark.boardTitle]
            .join(" ")
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter(
        (group) =>
          group.normalizedUrl.toLowerCase().includes(q) ||
          group.domain.toLowerCase().includes(q) ||
          group.bookmarks.length > 0,
      );
  }, [collection.duplicateGroups, query]);

  const filteredDomainGroups = useMemo(() => {
    const groups = collection.domainGroups ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        bookmarks: group.bookmarks.filter((bookmark) =>
          [bookmark.title, bookmark.url, bookmark.pageTitle, bookmark.boardTitle]
            .join(" ")
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter(
        (group) =>
          group.domain.toLowerCase().includes(q) || group.bookmarks.length > 0,
      );
  }, [collection.domainGroups, query]);

  const bookmarkForEdit = useArcalistStore((state) =>
    editing
      ? state.pages
          .flatMap((page) => page.boards)
          .find((board) => board.id === editing.boardId)
          ?.bookmarks.find((bookmark) => bookmark.id === editing.bookmarkId) ??
        null
      : null,
  );

  const hasResults =
    collection.id === "duplicates"
      ? filteredDuplicateGroups.length > 0
      : collection.id === "by-domain"
        ? filteredDomainGroups.length > 0
        : filteredBookmarks.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] px-3 py-2">
        <Search size={14} className="text-[var(--arc-text-secondary)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${collection.name.toLowerCase()}...`}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--arc-text-primary)] outline-none placeholder:text-[var(--arc-text-secondary)]"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {!hasResults ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--arc-glass-border)] text-center text-sm text-[var(--arc-text-secondary)]">
            {query ? "No matching bookmarks found." : collection.emptyState}
          </div>
        ) : collection.id === "duplicates" ? (
          <div className="space-y-3">
            {filteredDuplicateGroups.map((group) => (
              <GroupSection
                key={group.normalizedUrl}
                title={group.domain || group.normalizedUrl}
                subtitle={`${group.bookmarks.length} duplicate bookmarks`}
              >
                {group.bookmarks.map((bookmark) => (
                  <BookmarkResult
                    key={`${bookmark.boardId}-${bookmark.bookmarkId}`}
                    bookmark={bookmark}
                    onEdit={setEditing}
                  />
                ))}
              </GroupSection>
            ))}
          </div>
        ) : collection.id === "by-domain" ? (
          <div className="space-y-3">
            {filteredDomainGroups.map((group) => (
              <GroupSection
                key={group.domain}
                title={group.domain}
                subtitle={`${group.bookmarks.length} bookmarks`}
              >
                {group.bookmarks.map((bookmark) => (
                  <BookmarkResult
                    key={`${bookmark.boardId}-${bookmark.bookmarkId}`}
                    bookmark={bookmark}
                    onEdit={setEditing}
                  />
                ))}
              </GroupSection>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBookmarks.map((bookmark) => (
              <BookmarkResult
                key={`${bookmark.boardId}-${bookmark.bookmarkId}`}
                bookmark={bookmark}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </div>

      {bookmarkForEdit && editing && (
        <BookmarkEditModal
          open
          onClose={() => setEditing(null)}
          bookmark={bookmarkForEdit}
          boardId={editing.boardId}
        />
      )}
    </div>
  );
}

function GroupSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--arc-glass-border)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--arc-glass-border)] px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--arc-text-primary)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--arc-text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-[var(--arc-glass-border)]">
        {children}
      </div>
    </section>
  );
}

function BookmarkResult({
  bookmark,
  onEdit,
}: {
  bookmark: SmartCollectionResult;
  onEdit: (bookmark: SmartCollectionResult) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const recordBookmarkVisit = useArcalistStore(
    (state) => state.recordBookmarkVisit,
  );
  const trashBookmark = useArcalistStore((state) => state.trashBookmark);
  const openInNewTab = useArcalistStore((state) => state.settings.openInNewTab);
  const favicon = bookmark.favicon ?? bookmark.faviconUrl ?? "";
  const domain = getDomainFromUrl(bookmark.url);

  const handleOpen = () => {
    if (openSafeUrl(bookmark.url, openInNewTab ? "_blank" : "_self")) {
      recordBookmarkVisit(bookmark.boardId, bookmark.bookmarkId);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Move "${bookmark.title || bookmark.url}" to trash?`,
    );
    if (confirmed) {
      trashBookmark(bookmark.boardId, bookmark.bookmarkId);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {!imgError && favicon ? (
        <img
          src={favicon}
          alt=""
          className="h-5 w-5 shrink-0 rounded-sm"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[var(--arc-button-bg)] text-[9px] font-bold uppercase text-[var(--arc-text-secondary)]">
          {(bookmark.title || domain || "?").charAt(0)}
        </div>
      )}

      <button onClick={handleOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm text-[var(--arc-text-primary)]">
          {bookmark.title || bookmark.url}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--arc-text-secondary)]">
          {domain || bookmark.url} · {bookmark.pageTitle} / {bookmark.boardTitle}
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleOpen}
          title="Open bookmark"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-accent)]"
        >
          <ArrowUpRight size={14} />
        </button>
        <button
          onClick={() => onEdit(bookmark)}
          title="Edit original bookmark"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--arc-text-secondary)] hover:bg-[var(--arc-button-bg)] hover:text-[var(--arc-accent)]"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleDelete}
          title="Move original bookmark to trash"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--arc-text-secondary)] hover:bg-red-400/10 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
