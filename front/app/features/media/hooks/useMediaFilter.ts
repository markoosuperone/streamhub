'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  DEFAULT_MEDIA_FILTER,
  isMediaFilter,
  MEDIA_QUERY_PARAMS,
  type MediaFilter,
} from '@/app/entities/media/lib/filter';

type UseMediaFilterResult = {
  filter: MediaFilter;
  setFilter: (next: MediaFilter) => void;
};

// The filter tab lives in the URL (like the search query) so it survives a
// reload or a shared link instead of resetting to "all" every time. Reused on
// both Home and Library, each with its own media list — stays on whichever
// page (`pathname`) is actually active rather than hardcoding one.
export function useMediaFilter(): UseMediaFilterResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterParam = searchParams.get(MEDIA_QUERY_PARAMS.filter);
  const filter: MediaFilter = isMediaFilter(filterParam) ? filterParam : DEFAULT_MEDIA_FILTER;

  const setFilter = (next: MediaFilter) => {
    const params = new URLSearchParams();
    const query = searchParams.get(MEDIA_QUERY_PARAMS.search);
    if (query) params.set(MEDIA_QUERY_PARAMS.search, query);
    if (next !== DEFAULT_MEDIA_FILTER) params.set(MEDIA_QUERY_PARAMS.filter, next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return { filter, setFilter };
}
