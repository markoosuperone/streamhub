import { Type } from "typebox";
import { Uuid } from "@/shared/http/schemas.ts";

const DateTime = Type.String({ format: "date-time" });

export const AuthUserResponse = Type.Object(
  {
    user_id: Uuid,
    email: Type.String({ format: "email" }),
  },
  { additionalProperties: false }
);

export const AuthResponse = Type.Object(
  {
    user: AuthUserResponse,
    access_token: Type.String({ minLength: 1 }),
    refresh_token: Type.String({ minLength: 1 }),
    access_token_expires_at: DateTime,
    refresh_token_expires_at: DateTime,
  },
  { additionalProperties: false }
);

export const LoginBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, format: "password" }),
  },
  { additionalProperties: false }
);

export const RegisterBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, format: "password" }),
  },
  { additionalProperties: false }
);

export const RefreshTokenBody = Type.Object(
  {
    refresh_token: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);
export const LogoutBody = Type.Object(
  {
    session_id: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);