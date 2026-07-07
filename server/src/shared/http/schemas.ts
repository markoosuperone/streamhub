import { Type } from "typebox";

export const Uuid = Type.String({ format: "uuid" });

export const IdParams = Type.Object(
  {
    id: Uuid,
  },
  { additionalProperties: false }
);
export const OwnerIdParams = Type.Object(
  {
    owner_id: Uuid,
    limit: Type.Optional(
      Type.Integer({
        minimum: 1,
        maximum: 100,
      })
    ),
    offset: Type.Optional(
      Type.Integer({
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false }
);
