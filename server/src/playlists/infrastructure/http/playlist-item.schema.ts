import { Type } from "typebox";
import { IdParams, Uuid } from "@/shared/http/schemas.ts";

export const PlaylistItemIdParams = IdParams;

export const PlaylistItemsByPlaylistIdParams = Type.Object({
  playlistId: Uuid,
});

export const CreatePlaylistItemBody = Type.Object(
  {
    playlist_id: Uuid,
    media_id: Uuid,
    position: Type.Optional(Type.Integer({ minimum: 1 })),
  },
  { additionalProperties: false },
);

export const UpdatePlaylistItemBody = Type.Object(
  {
    position: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);
