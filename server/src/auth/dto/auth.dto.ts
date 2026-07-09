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

export type VerifyTokenPayloadDTO = Record<string, never>;
