// Remembers the visitor's last property search for this browser tab, so "Back to Search" on a
// listing returns to it and the results reopen at the same scroll position. The search itself
// lives in the URL (src/app/listings/page.tsx); this only records which URL and how far down.
// sessionStorage can be unavailable (private windows, blocked storage), so every access is guarded.

const LAST_SEARCH = "portal:lastSearch";
const SCROLL = "portal:searchScroll";

export function rememberSearch(url: string): void {
  try {
    sessionStorage.setItem(LAST_SEARCH, url);
  } catch {}
}

export function lastSearch(): string | null {
  try {
    return sessionStorage.getItem(LAST_SEARCH);
  } catch {
    return null;
  }
}

export function rememberScroll(url: string, y: number): void {
  try {
    sessionStorage.setItem(SCROLL, JSON.stringify({ url, y }));
  } catch {}
}

// The saved scroll position, if it was saved for this same search URL
export function savedScroll(url: string): number | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL) ?? "null") as { url: string; y: number } | null;
    return saved && saved.url === url ? saved.y : null;
  } catch {
    return null;
  }
}
