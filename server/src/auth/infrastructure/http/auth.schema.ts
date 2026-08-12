import { Type } from "typebox";
import { Uuid } from "@/shared/http/schemas.ts";

export const AuthUserResponse = Type.Object(
  {
    user_id: Uuid,
    email: Type.String({ format: "email" }),
  },
  { additionalProperties: false },
);

// Only the user: the token pair is delivered as httpOnly cookies, so putting it
// in the body too would hand the browser credentials it must not be able to read.
export const AuthResponse = Type.Object(
  {
    user: AuthUserResponse,
  },
  { additionalProperties: false },
);

export const CsrfTokenResponse = Type.Object(
  {
    csrf_token: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const LoginBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, format: "password" }),
  },
  { additionalProperties: false },
);

export const RegisterBody = Type.Object(
  {
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8, format: "password" }),
  },
  { additionalProperties: false },
);
