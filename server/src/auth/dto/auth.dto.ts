import { UserDTO } from "@superplayer/contracts";
import { IUser } from "@/users/domain/user.entity.ts";

export function toUserDTO(user: IUser): UserDTO {
  return { user_id: user.id, email: user.email };
}

export interface SessionDTO {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
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

// Server-internal: tokens cross the use-case → controller boundary so the
// controller can put them in cookies, but they never cross the HTTP boundary.
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

export type VerifyTokenPayloadDTO = Record<string, never>;
