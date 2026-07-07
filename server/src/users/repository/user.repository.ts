/**
 * User Repository Port (Interface)
 * Defines the contract for user data access in the domain layer
 */
import { IUser } from "@/users/domain/user.entity.ts";
import {
  CreateUserDto,
  GetUserByEmailDto,
  GetUserByIdDto,
} from "@/users/domain/user.dto.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";

export interface IUserRepository {
  createUser: (user: CreateUserDto, tx?: IDbTransaction) => Promise<IUser>;
  getUserByEmail: (email: GetUserByEmailDto, tx?: IDbTransaction) => Promise<IUser | null>;
  getUserById: (id: GetUserByIdDto, tx?: IDbTransaction) => Promise<IUser | null>;
}
