// Every path is `/api` + the backend's own route, because the rewrite in
// next.config.ts strips exactly that prefix. Keep the two in step: a path that
// doesn't mirror a real backend route will 404 after the rewrite.
export const API = {
  auth: {
    register: '/api/register',
    login: '/api/login',
    logout: '/api/logout',
    csrfToken: '/api/csrf-token',
  },
  users: {
    me: '/api/me',
    list: '/api/users',
    get: (id: string) => `/api/users/${id}`,
  },
  media: {
    upload: '/api/media/upload',
    list: '/api/media',
    get: (mediaId: string) => `/api/media/${mediaId}`,
    thumbnail: (mediaId: string) => `/api/media/${mediaId}/thumbnail`,
    delete: (mediaId: string) => `/api/media/${mediaId}`,
  },
  playlists: {
    list: '/api/playlists',
    create: '/api/playlists',
    get: (id: string) => `/api/playlists/${id}`,
    update: (id: string) => `/api/playlists/${id}`,
    delete: (id: string) => `/api/playlists/${id}`,
  },
  playlistItems: {
    create: '/api/playlist-items',
    get: (id: string) => `/api/playlist-items/${id}`,
    update: (id: string) => `/api/playlist-items/${id}`,
    delete: (id: string) => `/api/playlist-items/${id}`,
    byPlaylistId: (playlistId: string) => `/api/playlist-items/${playlistId}/items`,
  },
} as const;
