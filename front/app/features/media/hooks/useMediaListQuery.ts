'use client';

import type { MediaResponseDTO } from '@superplayer/contracts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MEDIA_QUERY_PARAMS, type MediaFilter } from '@/app/entities/media/lib/filter';
import type { UploadEvent } from '@/app/entities/media/model/types';
import { useUploadService } from '@/app/entities/media/model/UploadProvider';
import { MEDIA_API } from '@/app/shared/api/media.api';
import { PLAYLIST_ITEMS_API } from '@/app/shared/api/playlistItems.api';

export const MEDIA_ITEMS_PER_PAGE = 12;

export const MEDIA_STATUS = {
  idle: 'idle',
  loading: 'loading',
  loaded: 'loaded',
  aborted: 'aborted',
  error: 'error',
} as const;

export type MediaStatus = (typeof MEDIA_STATUS)[keyof typeof MEDIA_STATUS];

type FetchMediaPageQuery = {
  page: number;
  filter: MediaFilter;
  search: string;
  selectedPlaylistId?: string | null;
};

type FetchMediaPageResult =
  | { status: typeof MEDIA_STATUS.loaded; media: MediaResponseDTO[]; total: number }
  | { status: typeof MEDIA_STATUS.error }
  // A caller-visible "aborted" outcome instead of throwing — an aborted
  // fetch is a silent no-op (a newer request superseded it), not an error.
  | { status: typeof MEDIA_STATUS.aborted };

async function fetchMediaPage(
  { page, filter, search, selectedPlaylistId }: FetchMediaPageQuery,
  signal: AbortSignal,
): Promise<FetchMediaPageResult> {
  const query = {
    limit: MEDIA_ITEMS_PER_PAGE,
    offset: (page - 1) * MEDIA_ITEMS_PER_PAGE,
    search: search.trim() || undefined,
    type: filter === 'all' ? undefined : filter,
  };

  try {
    if (selectedPlaylistId) {
      const result = await PLAYLIST_ITEMS_API.listByPlaylist(selectedPlaylistId, query, { signal });
      return {
        status: MEDIA_STATUS.loaded,
        media: result.items.map((item) => item.media),
        total: result.total,
      };
    }
    const result = await MEDIA_API.list(query, { signal });
    return { status: MEDIA_STATUS.loaded, media: result.items, total: result.total };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      return { status: MEDIA_STATUS.aborted };
    return { status: MEDIA_STATUS.error };
  }
}

type UseMediaListParams = {
  filter: MediaFilter;
  search: string;
  // When set, "media" is that playlist's tracks (via the playlist-items
  // endpoint) instead of the general shared library.
  selectedPlaylistId?: string | null;
};

type UseMediaListResult = {
  media: MediaResponseDTO[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  removeMedia: (mediaId: string) => void;
  // Surfaced so a caller can tell "nothing here yet" apart from "the request
  // failed" — both leave `media` empty, and only one of them should invite the
  // user to upload something.
  status: MediaStatus;
  retry: () => void;
};

// Filtering, search and pagination all happen server-side — this hook owns
// the current page (kept in the URL, like filter/search, so it survives a
// reload or a shared link) and its own local media/total/status state (each
// Home/Library instance gets its own list, not a shared global one). The one
// cross-cutting concern — a new upload appearing without this hook's own
// page/filter/search changing — is handled by subscribing to uploadService
// rather than a shared store.
export function useMediaListQuery({
  filter,
  search,
  selectedPlaylistId,
}: UseMediaListParams): UseMediaListResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const uploadService = useUploadService();

  const [media, setMedia] = useState<MediaResponseDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<MediaStatus>(MEDIA_STATUS.idle);

  const pageParam = Number(searchParams.get(MEDIA_QUERY_PARAMS.page));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next > 1) params.set(MEDIA_QUERY_PARAMS.page, String(next));
      else params.delete(MEDIA_QUERY_PARAMS.page);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname],
  );

  // A filter/search change produces a new result set — start back at page 1
  // rather than landing wherever the old set's page N happened to leave off.
  // Compare against the *previous* filter/search rather than just running on
  // every mount, otherwise a page number arriving from the URL (reload, a
  // shared link) would get wiped back to 1 immediately on first render.
  const previousQueryRef = useRef({ filter, search });
  useEffect(() => {
    const previous = previousQueryRef.current;
    if (previous.filter !== filter || previous.search !== search) {
      setPage(1);
    }
    previousQueryRef.current = { filter, search };
  }, [filter, search, setPage]);

  // Aborts the in-flight request when a newer one fires before this one
  // resolves — a "newer" fetch can come from either trigger below (a
  // page/filter/search/selectedPlaylistId change, or an upload completing
  // elsewhere on the page), so both share this one abortable fetch instead of
  // each keeping its own duplicate copy.
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetch = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const result = await fetchMediaPage(
      { page, filter, search, selectedPlaylistId },
      controller.signal,
    );
    if (result.status === MEDIA_STATUS.aborted) return;
    if (result.status === MEDIA_STATUS.loaded) {
      setMedia(result.media);
      setTotal(result.total);
    }
    setStatus(result.status === MEDIA_STATUS.loaded ? MEDIA_STATUS.loaded : MEDIA_STATUS.error);
  }, [page, filter, search, selectedPlaylistId]);

  useEffect(() => {
    void refetch();
    // Abort on unmount too, not just when a newer fetch supersedes this one:
    // navigating away mid-request would otherwise leave it running to
    // completion and then set state on a component that is gone.
    return () => abortControllerRef.current?.abort();
  }, [refetch]);

  // A new upload can only ever change the general shared library, never a
  // specific playlist's contents (uploading doesn't add anything to a
  // playlist) — only refetch on "completed" while browsing the library, not
  // while a playlist is selected.
  useEffect(() => {
    if (selectedPlaylistId) return;

    const handleUploadEvent = (event: UploadEvent) => {
      if (event.type === 'completed') void refetch();
    };
    uploadService.subscribe(handleUploadEvent);

    return () => uploadService.unsubscribe(handleUploadEvent);
  }, [refetch, uploadService, selectedPlaylistId]);

  const totalPages = Math.max(1, Math.ceil(total / MEDIA_ITEMS_PER_PAGE));

  // If a delete empties the current (e.g. last) page, drop back to the new
  // last page instead of showing a dangling empty one. Gated on a real
  // `loaded` response so a page number from the URL isn't "corrected" away
  // against `total`'s pre-fetch default of 0, before the real count is
  // known, and so a transient fetch error doesn't wipe out a valid page.
  useEffect(() => {
    if (status === MEDIA_STATUS.loaded && page > totalPages) {
      setPage(totalPages);
    }
  }, [status, page, totalPages, setPage]);

  const removeMedia = useCallback((mediaId: string) => {
    setMedia((current) => current.filter((item) => item.id !== mediaId));
    setTotal((current) => Math.max(0, current - 1));
  }, []);

  return { media, page, totalPages, setPage, removeMedia, status, retry: refetch };
}
