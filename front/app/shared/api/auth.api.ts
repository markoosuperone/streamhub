import type {
  AuthResponseDTO,
  LoginBodyDTO,
  RegisterBodyDTO,
  UserDTO,
} from '@superplayer/contracts';

import { api } from '@/app/shared/api/api';
import { API } from '@/app/shared/api/endpoints';

// There is no refresh call here on purpose: the backend renews an expired
// access-token cookie on the request that needs it, so the browser never has to
// notice a session expiring.
export const AUTH_API = {
  // The response carries the user and nothing else — the token pair arrives as
  // httpOnly cookies the browser cannot read.
  async register(body: RegisterBodyDTO): Promise<UserDTO> {
    const auth = await api.post<AuthResponseDTO>(API.auth.register, body);
    return auth.user;
  },

  async login(body: LoginBodyDTO): Promise<UserDTO> {
    const auth = await api.post<AuthResponseDTO>(API.auth.login, body);
    return auth.user;
  },

  logout(): Promise<void> {
    return api.post(API.auth.logout);
  },
};
