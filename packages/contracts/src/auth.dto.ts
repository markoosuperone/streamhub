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

// Tokens are deliberately absent: they travel as httpOnly cookies, so they are
// never part of a response body the browser can read.
export interface AuthResponseDTO {
  user: UserDTO;
}

export interface CsrfTokenDTO {
  csrf_token: string;
}
