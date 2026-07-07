import { Type } from "typebox";
import { Uuid } from "@/shared/http/schemas.ts";

export const MediaIdParams = Type.Object(
  {
    mediaId: Uuid,
  },
  { additionalProperties: false }
);
