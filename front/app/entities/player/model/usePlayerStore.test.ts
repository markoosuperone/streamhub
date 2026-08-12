import type { MediaResponseDTO } from '@superplayer/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from './usePlayerStore';

function makeMedia(id: string): MediaResponseDTO {
  return {
    id,
    title: `Track ${id}`,
    media_type: 'audio',
    duration_seconds: 120,
    owner_id: 'owner-1',
    description: null,
  } as MediaResponseDTO;
}

const A = makeMedia('a');
const B = makeMedia('b');
const C = makeMedia('c');
const D = makeMedia('d');

beforeEach(() => {
  usePlayerStore.getState().reset();
});

describe('play', () => {
  it('sets nowPlaying and splits the rest of media into upPrev/upNext', () => {
    usePlayerStore.getState().play(B, [A, B, C, D]);

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(B);
    expect(state.upPrev).toEqual([A]);
    expect(state.upNext).toEqual([C, D]);
  });

  it('does nothing if the item is not present in media', () => {
    usePlayerStore.getState().play(A, [B, C]);

    expect(usePlayerStore.getState().nowPlaying).toBeNull();
  });
});

describe('playFromQueue', () => {
  it('jumps to an item in upNext, moving passed-over items and the old nowPlaying into upPrev', () => {
    usePlayerStore.getState().play(A, [A, B, C, D]);

    usePlayerStore.getState().playFromQueue(C);

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(C);
    expect(state.upPrev).toEqual([A, B]);
    expect(state.upNext).toEqual([D]);
  });

  it('does nothing if the item is not in upNext', () => {
    usePlayerStore.getState().play(A, [A, B]);
    const before = usePlayerStore.getState();

    usePlayerStore.getState().playFromQueue(D);

    expect(usePlayerStore.getState()).toMatchObject({
      nowPlaying: before.nowPlaying,
      upNext: before.upNext,
      upPrev: before.upPrev,
    });
  });
});

describe('next', () => {
  it('advances to the first upNext item, pushing the old nowPlaying onto upPrev', () => {
    usePlayerStore.getState().play(A, [A, B, C]);

    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(B);
    expect(state.upPrev).toEqual([A]);
    expect(state.upNext).toEqual([C]);
  });

  it('wraps to the start of upPrev when upNext is empty', () => {
    usePlayerStore.getState().play(C, [A, B, C]);

    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(A);
    expect(state.upNext).toEqual([B, C]);
    expect(state.upPrev).toEqual([]);
  });

  it('does nothing when nothing is playing', () => {
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().nowPlaying).toBeNull();
  });

  // With nothing left to advance to and no history to wrap into, the queue is
  // simply exhausted. `nowPlaying` has to end up null rather than undefined:
  // both are falsy so the UI looked fine either way, but `undefined` is a
  // value the store's own type says cannot occur.
  it('clears nowPlaying to null when the queue is exhausted with no history', () => {
    usePlayerStore.getState().play(A, [A]);

    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBeNull();
    expect(state.nowPlaying).not.toBeUndefined();
    expect(state.upNext).toEqual([]);
  });
});

describe('prev', () => {
  it('goes back to the last upPrev item, pushing nowPlaying to the front of upNext', () => {
    usePlayerStore.getState().play(C, [A, B, C, D]);

    usePlayerStore.getState().prev();

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(B);
    expect(state.upPrev).toEqual([A]);
    expect(state.upNext).toEqual([C, D]);
  });

  it('does nothing when upPrev is empty', () => {
    usePlayerStore.getState().play(A, [A, B]);

    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().nowPlaying).toBe(A);
  });
});

describe('updateQueue', () => {
  it('re-derives upNext/upPrev around the current nowPlaying without changing it', () => {
    usePlayerStore.getState().play(B, [A, B]);

    usePlayerStore.getState().updateQueue([A, B, C, D]);

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(B);
    expect(state.upPrev).toEqual([A]);
    expect(state.upNext).toEqual([C, D]);
  });

  it('does nothing when nothing is playing', () => {
    usePlayerStore.getState().updateQueue([A, B]);

    expect(usePlayerStore.getState().nowPlaying).toBeNull();
    expect(usePlayerStore.getState().upNext).toEqual([]);
  });

  it('does nothing when nowPlaying is no longer present in the new media list', () => {
    usePlayerStore.getState().play(A, [A, B]);

    usePlayerStore.getState().updateQueue([C, D]);

    const state = usePlayerStore.getState();
    expect(state.nowPlaying).toBe(A);
    expect(state.upNext).toEqual([B]);
  });
});

describe('clearIfPlaying', () => {
  it('clears nowPlaying when the given id matches', () => {
    usePlayerStore.getState().play(A, [A, B]);

    usePlayerStore.getState().clearIfPlaying(A.id);

    expect(usePlayerStore.getState().nowPlaying).toBeNull();
  });

  it('leaves nowPlaying untouched when the id does not match', () => {
    usePlayerStore.getState().play(A, [A, B]);

    usePlayerStore.getState().clearIfPlaying(B.id);

    expect(usePlayerStore.getState().nowPlaying).toBe(A);
  });
});

describe('reset', () => {
  it('clears nowPlaying, upNext, and upPrev', () => {
    usePlayerStore.getState().play(B, [A, B, C]);

    usePlayerStore.getState().reset();

    expect(usePlayerStore.getState()).toMatchObject({
      nowPlaying: null,
      upNext: [],
      upPrev: [],
    });
  });
});
