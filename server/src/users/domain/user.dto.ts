

export interface CreateUserDTO {
  email: string;
  password_hash: string;
}

export interface GetUserByEmailDTO {
  email: string;
}

export interface GetUserByIdDTO {
  id: number;
}
