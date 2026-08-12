'use client';

import { usePathname, useRouter } from 'next/navigation';

import { MEDIA_QUERY_PARAMS } from '@/app/entities/media/lib/filter';
import { SearchInput } from '@/app/shared/ui/SearchInput/SearchInput';

export function MediaSearchInput() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (value: string) => {
    const query = value.trim();
    // Preserve an active filter tab so searching doesn't silently drop it.
    const filterParam = new URLSearchParams(window.location.search).get(MEDIA_QUERY_PARAMS.filter);
    const params = new URLSearchParams();
    if (filterParam) params.set(MEDIA_QUERY_PARAMS.filter, filterParam);
    if (query) params.set(MEDIA_QUERY_PARAMS.search, query);
    const queryStr = params.toString();
    router.replace(queryStr ? `${pathname}?${queryStr}` : pathname);
  };

  return <SearchInput placeholder="Search tracks, videos, creators…" onChange={handleSearch} />;
}
