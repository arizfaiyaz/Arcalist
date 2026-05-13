import { useEffect, useState } from "react";
import { ExternalLink, Link } from "lucide-react";
import { fetchPublicSharedPage } from "../../lib/sharing";
import { normalizeSafeUrl } from "../../lib/urlSafety";
import type { PublicSharedPage } from "../../types/sharing";

type Props = {
  token: string;
};

export function SharedPageView({ token }: Props) {
  const [sharedPage, setSharedPage] = useState<PublicSharedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const page = await fetchPublicSharedPage(token);
        if (!page) {
          setError("This shared page is invalid, revoked, or no longer available.");
          return;
        }
        setSharedPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-[var(--arc-text-primary)]">
      <main className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-[var(--arc-glass-border)] bg-[var(--arc-glass-bg)] p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-button-bg)] text-[var(--arc-accent)]">
              <Link size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--arc-text-secondary)]">
                Arcalist shared page
              </p>
              <h1 className="text-2xl font-semibold">
                {sharedPage?.snapshot.page.title ?? "Shared Page"}
              </h1>
            </div>
          </div>
        </header>

        {loading ? (
          <StateCard text="Loading shared page..." />
        ) : error ? (
          <StateCard text={error} />
        ) : sharedPage ? (
          <div
            className="columns-1 gap-4 md:columns-2 xl:columns-3"
            aria-label="Shared boards"
          >
            {sharedPage.snapshot.boards.map((board) => (
              <section
                key={board.id}
                className="mb-4 break-inside-avoid rounded-xl border border-[var(--arc-glass-border)] bg-[var(--arc-glass-bg)] p-3 shadow-lg shadow-black/10"
              >
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--arc-text-secondary)]">
                  {board.title}
                </h2>
                <div className="space-y-1">
                  {board.bookmarks.map((bookmark) => {
                    const safeUrl = normalizeSafeUrl(bookmark.url);
                    if (!safeUrl) return null;
                    return (
                    <a
                      key={bookmark.id}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--arc-text-primary)] hover:bg-[var(--arc-button-bg)]"
                    >
                      {bookmark.favicon || bookmark.faviconUrl ? (
                        <img
                          src={bookmark.favicon ?? bookmark.faviconUrl}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-sm"
                        />
                      ) : (
                        <div className="h-4 w-4 shrink-0 rounded-sm bg-[var(--arc-button-bg)]" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {bookmark.title || bookmark.url}
                      </span>
                      <ExternalLink
                        size={12}
                        className="shrink-0 text-[var(--arc-text-secondary)]"
                      />
                    </a>
                    );
                  })}
                  {board.bookmarks.length === 0 && (
                    <p className="px-2 py-3 text-sm text-[var(--arc-text-secondary)]">
                      No bookmarks in this board.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--arc-glass-border)] bg-[var(--arc-glass-bg)] px-5 py-12 text-center text-[var(--arc-text-secondary)]">
      {text}
    </div>
  );
}
