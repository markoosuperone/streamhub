import type {
  PaginatedResponse,
  PlaylistCreateBodyDTO,
  PlaylistResponseDTO,
  PlaylistUpdateBodyDTO,
} from '@superplayer/contracts';

import { api } from '@/app/shared/api/api';
import { API } from '@/app/shared/api/endpoints';

export const PLAYLISTS_API = {
  list(): Promise<PaginatedResponse<PlaylistResponseDTO>> {
    return api.get(API.playlists.list);
  },

  create(body: PlaylistCreateBodyDTO): Promise<PlaylistResponseDTO> {
    return api.post(API.playlists.create, body);
  },

  update(id: string, body: PlaylistUpdateBodyDTO): Promise<PlaylistResponseDTO> {
    return api.patch(API.playlists.update(id), body);
  },

  delete(id: string): Promise<void> {
    return api.delete(API.playlists.delete(id));
  },
};
