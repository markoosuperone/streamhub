// Set by the backend, not here — these names exist so `proxy.ts` can tell a
// signed-in visitor from an anonymous one before rendering a protected route.
export const AUTH_COOKIES = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

export const AUTH_MODES = {
  login: 'login',
  register: 'register',
} as const;

export const AUTH_BUTTONS_IDS = {
  login: 'login-tab',
  register: 'register-tab',
} as const;

export const AUTH_FIELD_NAMES = {
  mode: 'mode',
  email: 'email',
  password: 'password',
} as const;
