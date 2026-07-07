import { CustomError } from "@/shared/error/error.ts";

const PlaylistItemErrors = {
  PLAYLIST_ITEM_NOT_FOUND: "Playlist item not found",
  MEDIA_ITEM_FOR_CREATE_PLAYLIST_NOT_FOUND: "Media item not found",
  PLAYLIST_FOR_CREATE_PLAYLIST_NOT_FOUND: "Playlist not found",
  GET_PLAYLIST_ITEM_RECORD_ERROR: "Failed to get playlist item record",
  CREATE_PLAYLIST_ITEM_RECORD_ERROR: "Failed to create playlist item record",
  UPDATE_PLAYLIST_ITEM_RECORD_ERROR: "Failed to update playlist item record",
  DELETE_PLAYLIST_ITEM_RECORD_ERROR: "Failed to delete playlist item record",
  PLAYLIST_ITEM_ALREADY_EXISTS: "Playlist item already exists",
  PLAYLIST_ITEM_POSITION_ERROR: "Playlist item position is already taken",
  DECREMENT_POSITION_RECORD_ERROR: "Failed to decrement position record",
  INCREMENT_POSITION_RECORD_ERROR: "Failed to increment position record",
  POSITION_REQUIRED: "Position is required",
  
} as const;

export class PlaylistItemAlreadyExistsError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.PLAYLIST_ITEM_ALREADY_EXISTS, 400);
    this.name = "PlaylistItemAlreadyExistsError";
  }
}

export class PositionRequiredError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.POSITION_REQUIRED, 400);
    this.name = "PositionRequiredError";
  }
}

export class DecrementPositionRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.DECREMENT_POSITION_RECORD_ERROR, 500);
    this.name = "DecrementPositionRecordError";
  }
}

export class GetPlaylistItemRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.GET_PLAYLIST_ITEM_RECORD_ERROR, 500);
    this.name = "GetPlaylistItemRecordError";
  }
}

export class CreatePlaylistItemRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.CREATE_PLAYLIST_ITEM_RECORD_ERROR, 500);
    this.name = "CreatePlaylistItemRecordError";
  }
}

export class PlaylistItemNotFoundError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.PLAYLIST_ITEM_NOT_FOUND, 404);
    this.name = "PlaylistItemNotFoundError";
  }
}

export class MediaItemForCreatePlaylistNotFoundError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.MEDIA_ITEM_FOR_CREATE_PLAYLIST_NOT_FOUND, 404);
    this.name = "MediaItemForCreatePlaylistNotFoundError";
  }
}

export class UpdatePlaylistItemRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.UPDATE_PLAYLIST_ITEM_RECORD_ERROR, 500);
    this.name = "UpdatePlaylistItemRecordError";
  }
}

export class DeletePlaylistItemRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.DELETE_PLAYLIST_ITEM_RECORD_ERROR, 500);
    this.name = "DeletePlaylistItemRecordError";
  }
}

export class PlaylistItemPositionError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.PLAYLIST_ITEM_POSITION_ERROR, 400);
    this.name = "PlaylistItemPositionError";
  }
}
export class IncrementPositionRecordError extends CustomError {
  constructor() {
    super(PlaylistItemErrors.INCREMENT_POSITION_RECORD_ERROR, 500);
    this.name = "IncrementPositionRecordError";
  }
}
export class PlaylistForCreatePlaylistNotFoundError extends CustomError{
  constructor() {
    super(PlaylistItemErrors.PLAYLIST_FOR_CREATE_PLAYLIST_NOT_FOUND, 404);
    this.name = "MediaItemForCreatePlaylistNotFoundError";
  }
}
