'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MEDIA_QUERY_PARAMS } from '@/app/entities/media/lib/filter';

const SEARCH_DEBOUNCE_MS = 300;

type UseMediaSearchQueryResult = {
  query: string;
  debouncedQuery: string;
};

// Filtering/search hit the server on every change — debounce the raw query
// param before it drives a fetch, so typing doesn't fire a request per
// keystroke.
export function useMediaSearchQuery(): UseMediaSearchQueryResult {
  const searchParams = useSearchParams();
  const query = searchParams.get(MEDIA_QUERY_PARAMS.search) ?? '';

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  return { query, debouncedQuery };
}
