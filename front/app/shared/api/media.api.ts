import type {
  MediaListQueryDTO,
  MediaResponseDTO,
  PaginatedResponse,
} from '@superplayer/contracts';

import { api } from '@/app/shared/api/api';
import { API } from '@/app/shared/api/endpoints';

export const MEDIA_API = {
  list(
    query?: MediaListQueryDTO,
    options?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<MediaResponseDTO>> {
    const params = new URLSearchParams();
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.offset !== undefined) params.set('offset', String(query.offset));
    if (query?.search) params.set('search', query.search);
    if (query?.type) params.set('type', query.type);
    const queryString = params.toString();
    return api.get(`${API.media.list}${queryString ? `?${queryString}` : ''}`, options);
  },

  upload(file: File): Promise<MediaResponseDTO> {
    const formData = new FormData();
    formData.append('file', file);

    return api.post(API.media.upload, formData);
  },

  delete(mediaId: string): Promise<void> {
    return api.delete(API.media.delete(mediaId));
  },
};
