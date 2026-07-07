import { Type } from "typebox";
import { IdParams, OwnerIdParams } from "@/shared/http/schemas.ts";

export const PlaylistIdParams = IdParams;
export const PlaylistOwnerIdParams = OwnerIdParams;

export const CreatePlaylistBody = Type.Object(
  {
    title: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

export const UpdatePlaylistBody = Type.Object(
  {
    title: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);
