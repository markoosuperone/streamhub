import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMediaSearchQuery } from './useMediaSearchQuery';

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

describe('useMediaSearchQuery', () => {
  it('returns an empty query when there is no search param', () => {
    searchParams = new URLSearchParams();

    const { result } = renderHook(() => useMediaSearchQuery());

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
  });

  it('debouncedQuery starts equal to the initial query (no debounce delay on mount)', () => {
    searchParams = new URLSearchParams('q=hello');

    const { result } = renderHook(() => useMediaSearchQuery());

    expect(result.current.query).toBe('hello');
    expect(result.current.debouncedQuery).toBe('hello');
  });

  it('debounces a query change by 300ms before updating debouncedQuery', () => {
    vi.useFakeTimers();
    try {
      searchParams = new URLSearchParams('q=first');
      const { result, rerender } = renderHook(() => useMediaSearchQuery());
      expect(result.current.debouncedQuery).toBe('first');

      searchParams = new URLSearchParams('q=second');
      rerender();

      // Not yet updated before the debounce window elapses.
      expect(result.current.debouncedQuery).toBe('first');

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current.debouncedQuery).toBe('first');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.debouncedQuery).toBe('second');
    } finally {
      vi.useRealTimers();
    }
  });

  it('only applies the latest value when the query changes again before the debounce fires', async () => {
    searchParams = new URLSearchParams('q=first');
    const { result, rerender } = renderHook(() => useMediaSearchQuery());

    searchParams = new URLSearchParams('q=second');
    rerender();
    searchParams = new URLSearchParams('q=third');
    rerender();

    await waitFor(() => expect(result.current.debouncedQuery).toBe('third'));
  });
});
