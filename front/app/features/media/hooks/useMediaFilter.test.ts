import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMediaFilter } from './useMediaFilter';

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/library',
  useSearchParams: () => searchParams,
}));

describe('useMediaFilter', () => {
  it('defaults to "all" when no filter param is present', () => {
    searchParams = new URLSearchParams();

    const { result } = renderHook(() => useMediaFilter());

    expect(result.current.filter).toBe('all');
  });

  it('reads a valid filter from the URL', () => {
    searchParams = new URLSearchParams('filter=audio');

    const { result } = renderHook(() => useMediaFilter());

    expect(result.current.filter).toBe('audio');
  });

  it('falls back to "all" for an invalid filter value in the URL', () => {
    searchParams = new URLSearchParams('filter=nonsense');

    const { result } = renderHook(() => useMediaFilter());

    expect(result.current.filter).toBe('all');
  });

  it('setFilter replaces to the current pathname with the new filter param, preserving search', () => {
    searchParams = new URLSearchParams('q=hello');
    replace.mockClear();

    const { result } = renderHook(() => useMediaFilter());
    result.current.setFilter('video');

    expect(replace).toHaveBeenCalledWith('/library?q=hello&filter=video');
  });

  it('setFilter omits the filter param entirely when switching back to the default', () => {
    searchParams = new URLSearchParams('filter=audio');
    replace.mockClear();

    const { result } = renderHook(() => useMediaFilter());
    result.current.setFilter('all');

    expect(replace).toHaveBeenCalledWith('/library');
  });
});
