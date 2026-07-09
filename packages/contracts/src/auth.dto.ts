export interface UserDTO {
  user_id: string;
  email: string;
}

export interface RegisterBodyDTO {
  email: string;
  password: string;
}

export interface LoginBodyDTO {
  email: string;
  password: string;
}

export type TokenPairDTO = {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date;
};

export interface AuthResponseDTO extends TokenPairDTO {
  user: UserDTO;
  session_id: string;
}

export interface RefreshTokenResponseDTO {
  access_token: string;
  refresh_token: string;
}
