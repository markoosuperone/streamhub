import { Type } from "typebox";
import { Uuid } from "@/shared/http/schemas.ts";

export const UserResponse = Type.Object(
  {
    user_id: Uuid,
    email: Type.String({ format: "email" }),
  },
  { additionalProperties: false },
);

export const UsersListResponse = Type.Object(
  {
    items: Type.Array(UserResponse),
    total: Type.Integer({ minimum: 0 }),
    limit: Type.Integer({ minimum: 1 }),
    offset: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
