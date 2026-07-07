import { CustomError } from "@/shared/error/error.ts";

const PlaylistErrors = {
  CREATE_PLAYLIST_RECORD_ERROR: "Failed to create playlist record",
  GET_PLAYLIST_RECORD_ERROR: "Failed to get playlist record",
  PLAYLIST_NOT_FOUND: "Playlist not found",
  UPDATE_PLAYLIST_RECORD_ERROR: "Failed to update playlist record",
  DELETE_PLAYLIST_RECORD_ERROR: "Failed to delete playlist record",
  INVALID_PLAYLIST_TITLE: "Playlist title is required",
  INVALID_PLAYLIST_PAGINATION:
    "Invalid pagination: limit must be between 1 and 100, offset must be 0 or greater",
} as const;

export class CreatePlaylistRecordError extends CustomError {
  constructor() {
    super(PlaylistErrors.CREATE_PLAYLIST_RECORD_ERROR, 500);
    this.name = "CreatePlaylistRecordError";
  }
}
export class PlaylistNotFoundError extends CustomError {
  constructor() {
    super(PlaylistErrors.PLAYLIST_NOT_FOUND, 404);
    this.name = "PlaylistNotFoundError";
  }
}

export class GetPlaylistRecordError extends CustomError {
  constructor() {
    super(PlaylistErrors.GET_PLAYLIST_RECORD_ERROR, 500);
    this.name = "GetPlaylistRecordError";
  }
}

export class UpdatePlaylistRecordError extends CustomError {
  constructor() {
    super(PlaylistErrors.UPDATE_PLAYLIST_RECORD_ERROR, 500);
    this.name = "UpdatePlaylistRecordError";
  }
}

export class DeletePlaylistRecordError extends CustomError {
  constructor() {
    super(PlaylistErrors.DELETE_PLAYLIST_RECORD_ERROR, 500);
    this.name = "DeletePlaylistRecordError";
  }
}

export class InvalidPlaylistTitleError extends CustomError {
  constructor() {
    super(PlaylistErrors.INVALID_PLAYLIST_TITLE, 400);
    this.name = "InvalidPlaylistTitleError";
  }
}

export class InvalidPlaylistPaginationError extends CustomError {
  constructor() {
    super(PlaylistErrors.INVALID_PLAYLIST_PAGINATION, 400);
    this.name = "InvalidPlaylistPaginationError";
  }
}
