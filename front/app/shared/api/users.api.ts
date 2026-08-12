import type { PaginatedResponse, PaginationQueryDTO, UserDTO } from '@superplayer/contracts';

import { api } from '@/app/shared/api/api';
import { API } from '@/app/shared/api/endpoints';

export const USERS_API = {
  me(): Promise<UserDTO> {
    return api.get(API.users.me);
  },

  list(query?: Partial<PaginationQueryDTO>): Promise<PaginatedResponse<UserDTO>> {
    const params = new URLSearchParams();
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.offset !== undefined) params.set('offset', String(query.offset));
    const search = params.toString();
    return api.get(`${API.users.list}${search ? `?${search}` : ''}`);
  },

  get(id: string): Promise<UserDTO> {
    return api.get(API.users.get(id));
  },
};
