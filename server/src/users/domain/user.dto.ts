import { UserDTO } from "@superplayer/contracts";

export interface CreateUserDTO {
  email: string;
  password_hash: string;
}

export interface GetUserByEmailDTO {
  email: string;
}

export interface GetUserByIdDTO {
  id: string;
}

export interface GetAllUsersRepoResponseDTO {
  items: UserDTO[];
  total: number;
}
