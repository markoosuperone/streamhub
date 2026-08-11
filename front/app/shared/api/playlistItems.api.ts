import type {
  MediaListQueryDTO,
  PaginatedResponse,
  PlaylistItemCreateDTO,
  PlaylistItemResponseDTO,
  PlaylistItemWithMediaResponseDTO,
} from '@superplayer/contracts';

import { api } from '@/app/shared/api/api';
import { API } from '@/app/shared/api/endpoints';

export const PLAYLIST_ITEMS_API = {
  create(body: PlaylistItemCreateDTO): Promise<PlaylistItemResponseDTO> {
    return api.post(API.playlistItems.create, body);
  },

  listByPlaylist(
    playlistId: string,
    query?: MediaListQueryDTO,
    options?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<PlaylistItemWithMediaResponseDTO>> {
    const params = new URLSearchParams();
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.offset !== undefined) params.set('offset', String(query.offset));
    if (query?.search) params.set('search', query.search);
    if (query?.type) params.set('type', query.type);
    const queryString = params.toString();
    return api.get(
      `${API.playlistItems.byPlaylistId(playlistId)}${queryString ? `?${queryString}` : ''}`,
      options,
    );
  },

  delete(id: string): Promise<void> {
    return api.delete(API.playlistItems.delete(id));
  },

  // `position` only — the backend's UpdatePlaylistItemBody schema is
  // `additionalProperties: false`, so an `id` field in the body (as
  // PlaylistItemUpdateDTO has) would be rejected; the id is already in the URL.
  update(id: string, body: { position: number }): Promise<PlaylistItemResponseDTO> {
    return api.patch(API.playlistItems.update(id), body);
  },
};
