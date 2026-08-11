export const MEDIA_QUERY_PARAMS = {
  search: 'q',
  filter: 'filter',
  page: 'page',
} as const;

export type MediaFilter = 'all' | 'audio' | 'video';

export const MEDIA_FILTERS: MediaFilter[] = ['all', 'audio', 'video'];

export const DEFAULT_MEDIA_FILTER: MediaFilter = 'all';

export const MEDIA_FILTER_LABELS: Record<MediaFilter, string> = {
  all: 'All',
  audio: 'Audio',
  video: 'Video',
};

export function isMediaFilter(value: string | null): value is MediaFilter {
  return (MEDIA_FILTERS as string[]).includes(value ?? '');
}
