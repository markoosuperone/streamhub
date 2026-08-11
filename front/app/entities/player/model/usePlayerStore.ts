import type { MediaResponseDTO } from '@superplayer/contracts';
import { create } from 'zustand';

interface PlayerState {
  nowPlaying: MediaResponseDTO | null;
  upNext: MediaResponseDTO[];
  upPrev: MediaResponseDTO[];
  // Snapshots `media` (minus the item itself) into upNext/upPrev at the
  // moment playback starts, rather than deriving it live — so browsing to a
  // different filter/search while something plays doesn't reshuffle the
  // queue. Takes `media` as a parameter rather than reading a media store
  // directly — entities can't import other entities, so the caller (a
  // widget, which can see both stores) supplies it.
  play: (item: MediaResponseDTO, media: MediaResponseDTO[]) => void;
  // Jumps to an item already sitting in `upNext` (e.g. a click in the
  // up-next list) without touching the media store — `upNext`/`upPrev`
  // already have the ordering, so there's no need to re-derive it from a
  // `media` snapshot that may have moved on since `play()` was called.
  playFromQueue: (item: MediaResponseDTO) => void;
  // Re-derives upNext/upPrev from a fresh media array without touching
  // nowPlaying — for when the source a queue was snapshotted from changes
  // out from under it (e.g. a playlist gets a track added or reordered while
  // one of its tracks is playing). A no-op if nowPlaying isn't in `media`.
  updateQueue: (media: MediaResponseDTO[]) => void;
  // Called after a delete completes — clears `nowPlaying` only if the
  // deleted item was the one actually playing.
  clearIfPlaying: (mediaId: string) => void;
  next: () => void;
  prev: () => void;
  // Unconditional full clear — unlike `clearIfPlaying`, not scoped to a
  // specific id. Used on sign-out so playback state doesn't survive into a
  // different user's session on the same device.
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  nowPlaying: null,
  upNext: [],
  upPrev: [],
  play: (item, media) => {
    const index = media.findIndex((m) => m.id === item.id);
    if (index === -1) return;
    set({
      nowPlaying: item,
      upNext: media.slice(index + 1),
      upPrev: media.slice(0, index),
    });
  },
  playFromQueue: (item) => {
    const { nowPlaying, upNext, upPrev } = get();
    const index = upNext.findIndex((m) => m.id === item.id);
    if (index === -1) return;
    set({
      nowPlaying: item,
      upNext: upNext.slice(index + 1),
      upPrev: [...upPrev, ...(nowPlaying ? [nowPlaying] : []), ...upNext.slice(0, index)],
    });
  },
  updateQueue: (media) => {
    const { nowPlaying } = get();
    if (!nowPlaying) return;
    const index = media.findIndex((m) => m.id === nowPlaying.id);
    if (index === -1) return;
    set({
      upNext: media.slice(index + 1),
      upPrev: media.slice(0, index),
    });
  },
  next: () => {
    const { nowPlaying, upNext, upPrev } = get();
    if (!nowPlaying) return;

    const nextItem = upNext[0];

    if (!nextItem && upPrev.length > 0) {
      set({
        nowPlaying: upPrev[0] ?? null,
        upNext: [...upPrev.slice(1), nowPlaying],
        upPrev: [],
      });
      return;
    }
    // `?? null` because the queue can be exhausted with no history to wrap
    // into — `nowPlaying` is typed `| null`, and letting `undefined` through
    // would leave the store in a state its own type says is impossible.
    set({
      nowPlaying: nextItem ?? null,
      upNext: upNext.slice(1),
      upPrev: [...get().upPrev, nowPlaying],
    });
  },
  prev: () => {
    const { nowPlaying, upPrev } = get();
    if (!nowPlaying || upPrev.length === 0) return;

    const prevItem = upPrev[upPrev.length - 1];
    set({
      nowPlaying: prevItem,
      upNext: [nowPlaying, ...get().upNext],
      upPrev: upPrev.slice(0, -1),
    });
  },
  clearIfPlaying: (mediaId) =>
    set((state) => (state.nowPlaying?.id === mediaId ? { nowPlaying: null } : {})),
  reset: () => set({ nowPlaying: null, upNext: [], upPrev: [] }),
}));
