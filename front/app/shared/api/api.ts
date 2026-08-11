import type { CsrfTokenDTO } from '@superplayer/contracts';

import { ApiError, getErrorMessage } from './api.error';
import { API } from './endpoints';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// The backend requires a CSRF token on every cookie-authenticated mutation. It
// stays valid for as long as its secret cookie does, so it is fetched once and
// shared; holding the promise (rather than the value) also collapses a burst of
// simultaneous first mutations into a single request.
let csrfTokenRequest: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(API.auth.csrfToken, { credentials: 'include' });
  if (!response.ok) {
    throw new ApiError(response.status, 'Could not obtain a CSRF token');
  }
  const body = (await response.json()) as CsrfTokenDTO;
  return body.csrf_token;
}

function getCsrfToken(): Promise<string> {
  csrfTokenRequest ??= fetchCsrfToken().catch((error: unknown) => {
    csrfTokenRequest = null;
    throw error;
  });
  return csrfTokenRequest;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  retryOnCsrfRejection = true,
): Promise<T> {
  const { body, headers, method, ...rest } = options;

  const isFormData = body instanceof FormData;
  const needsCsrf = method !== undefined && MUTATING_METHODS.has(method);

  const response = await fetch(endpoint, {
    ...rest,
    method,
    credentials: 'include',
    headers: {
      // Fastify's JSON body parser rejects a request that declares
      // Content-Type: application/json but sends no body (e.g. a bodyless
      // DELETE), and multipart must keep the boundary fetch generates itself.
      ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined),
      ...(needsCsrf ? { 'x-csrf-token': await getCsrfToken() } : undefined),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // The backend raises 403 only for a rejected CSRF token, so this means the
  // secret rotated underneath us — worth one silent retry with a fresh token.
  if (response.status === 403 && needsCsrf && retryOnCsrfRejection) {
    csrfTokenRequest = null;
    return request<T>(endpoint, options, false);
  }

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw new ApiError(response.status, getErrorMessage(errorBody, response.status), errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Single same-origin client: the browser talks only to /api/*, which the
// rewrite in next.config.ts forwards to the backend. Authentication rides on
// httpOnly cookies, so no call site ever handles a token.
export const api = {
  get<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
