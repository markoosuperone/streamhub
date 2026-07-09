export const API = {
  health: '/health',
  auth: {
    register: '/register',
    login: '/login',
    refreshToken: '/refresh-token',
    logout: '/logout',
  },
  media: {
    upload: '/media/upload',
    list: '/media',
    get: (mediaId: string) => `/media/${mediaId}`,
    delete: (mediaId: string) => `/media/${mediaId}`,
  },
  playlists: {
    list: '/playlists',
    create: '/playlists',
    get: (id: string) => `/playlists/${id}`,
    update: (id: string) => `/playlists/${id}`,
    delete: (id: string) => `/playlists/${id}`,
  },
  playlistItems: {
    create: '/playlist-items',
    get: (id: string) => `/playlist-items/${id}`,
    update: (id: string) => `/playlist-items/${id}`,
    delete: (id: string) => `/playlist-items/${id}`,
    byPlaylistId: (playlistId: string) => `/playlist-items/${playlistId}/items`,
  },
} as const;
