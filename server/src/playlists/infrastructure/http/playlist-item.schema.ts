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
export const PlaylistItemListQueryString = Type.Object(
  {
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 100,
      }),
    ),
    offset: Type.Optional(
      Type.Integer({
        minimum: 0,
      }),
    ),
    search: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 200,
      }),
    ),
    // "image" is a valid MediaType domain-wide, but no upload path can ever
    // produce one yet, so it's left out of the filterable set for now.
    type: Type.Optional(
      Type.Union([Type.Literal("audio"), Type.Literal("video")]),
    ),
  },
  { additionalProperties: false },
);
