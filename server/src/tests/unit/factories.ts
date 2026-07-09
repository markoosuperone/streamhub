import { Readable } from "node:stream";
import { IUser } from "@/users/domain/user.entity.ts";
import { ISession } from "@/auth/domain/session.domain.ts";
import { TokenPairDTO } from "@superplayer/contracts";
import { IMedia } from "@/media/domain/media.domain.ts";
import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { IPlaylistItem } from "@/playlists/domain/playlist-item.domain.ts";

export const makeUser = (overrides: Partial<IUser> = {}): IUser => ({
  id: "user-1",
  email: "test@example.com",
  password_hash: "password-hash",
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const makeSession = (overrides: Partial<ISession> = {}): ISession => ({
  id: "session-1",
  user_id: "user-1",
  token_hash: "token-hash",
  expires_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const makeTokens = (overrides: Partial<TokenPairDTO> = {}): TokenPairDTO => ({
  access_token: "access-token",
  refresh_token: "refresh-token",
  access_token_expires_at: new Date(),
  refresh_token_expires_at: new Date(),
  ...overrides,
});

export const makeMedia = (overrides: Partial<IMedia> = {}): IMedia => ({
  id: "media-1",
  owner_id: "user-1",
  media_type: "video",
  description: null,
  file_path: "/uploads/media-1.mp4",
  mime_type: "video/mp4",
  size_bytes: 1024,
  duration_seconds: 60,
  title: "Sample Video",
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const makePlaylist = (overrides: Partial<IPlaylist> = {}): IPlaylist => ({
  id: "playlist-1",
  owner_id: "user-1",
  title: "My Playlist",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  ...overrides,
});

export const makePlaylistItem = (overrides: Partial<IPlaylistItem> = {}): IPlaylistItem => ({
  id: "item-1",
  playlist_id: "playlist-1",
  media_id: "media-1",
  position: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const makeStream = () => Readable.from(["chunk"]);
