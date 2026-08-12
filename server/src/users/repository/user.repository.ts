/**
 * User Repository Port (Interface)
 * Defines the contract for user data access in the domain layer
 */
import { IUser } from "@/users/domain/user.entity.ts";
import {
  CreateUserDTO,
  GetAllUsersRepoResponseDTO,
  GetUserByEmailDTO,
  GetUserByIdDTO,
} from "@/users/domain/user.dto.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";

export interface IUserRepository {
  createUser: (user: CreateUserDTO, tx?: IDbTransaction) => Promise<IUser>;
  getUserByEmail: (
    email: GetUserByEmailDTO,
    tx?: IDbTransaction,
  ) => Promise<IUser | null>;
  getUserById: (
    id: GetUserByIdDTO,
    tx?: IDbTransaction,
  ) => Promise<IUser | null>;
  getAllUsers: (
    limit: number,
    offset: number,
    tx?: IDbTransaction,
  ) => Promise<GetAllUsersRepoResponseDTO>;
}
