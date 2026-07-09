import { IUser } from "@/users/domain/user.entity.ts";

export type UserDTO = { user_id: string; email: string };

export function toUserDTO(user: IUser): UserDTO {
  return { user_id: user.id, email: user.email };
}

export interface RegisterAuthDTO {
  email: string;
  password: string;
}

export interface LoginAuthDTO {
  email: string;
  password: string;
}

export interface SessionDTO {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
}

export type TokenPairDTO = {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date;
};

export interface AuthResultDTO extends TokenPairDTO {
  user: UserDTO;
  session_id: string;
}

export interface RefreshTokenResultDTO {
  access_token: string;
  refresh_token: string;
}

export interface UpdateSessionDTO {
  id: string;
  token_hash: string;
  expires_at: Date;
}

export interface TokenPayloadDTO {
  user_id: string;
  session_id: string;
}

export type VerifyTokenPayloadDTO = Record<string, never>;
