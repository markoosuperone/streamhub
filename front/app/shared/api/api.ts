const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  },

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};