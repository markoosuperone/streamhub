

export interface CreateUserDto {
  email: string;
  password_hash: string;
}

export interface GetUserByEmailDto {
  email: string;
}

export interface GetUserByIdDto {
  id: number;
}
