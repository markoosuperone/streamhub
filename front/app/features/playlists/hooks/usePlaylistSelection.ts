'use client';

import { useSearchParams } from 'next/navigation';

// Lives in the URL (like the media filter/search/page params) rather than a
// store, so the selected playlist survives a reload/shared link and clicking
// Home (a plain `/`, no query string) naturally clears it.
export const PLAYLIST_QUERY_PARAM = 'playlist';

export function useSelectedPlaylistId(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get(PLAYLIST_QUERY_PARAM);
}
