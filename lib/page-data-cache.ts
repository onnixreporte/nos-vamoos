/**
 * Module-level in-memory cache for page data.
 * Survives client-side navigation (component unmount/remount) but resets on
 * full page refresh, which is the desired behaviour.
 *
 * Each entry is keyed by page name and invalidated whenever from/to/longTerm
 * changes. A manual refresh bypasses the cache by calling invalidatePageData
 * before fetching.
 */

interface CacheEntry<T> {
  from: string;
  to: string;
  longTerm: boolean;
  data: T;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCachedPageData<T>(
  key: string,
  from: string,
  to: string,
  longTerm?: boolean,
): T | null {
  const e = store.get(key) as CacheEntry<T> | undefined;
  if (
    e &&
    e.from === from &&
    e.to === to &&
    e.longTerm === (longTerm ?? false)
  )
    return e.data;
  return null;
}

export function setCachedPageData<T>(
  key: string,
  from: string,
  to: string,
  longTerm: boolean | undefined,
  data: T,
): void {
  store.set(key, { from, to, longTerm: longTerm ?? false, data });
}

export function invalidatePageData(key: string): void {
  store.delete(key);
}
