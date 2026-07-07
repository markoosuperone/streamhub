import { getDb } from "@/shared/db/postgres.ts";
import {
  CreateUserDto,
  GetUserByEmailDto,
  GetUserByIdDto,
} from "@/users/domain/user.dto.ts";
import { IUserRepository } from "@/users/repository/user.repository.ts";
import { IUser } from "@/users/domain/user.entity.ts";
import postgres from "postgres";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import {
  CreateUserError,
  GetUserRecordError,
} from "@/auth/error/errors.ts";
import { logger, markLogged } from "@/shared/logger/logger.ts";

type DbExecutor = postgres.Sql;

export class PGUserRepository implements IUserRepository {
  constructor(private readonly sql = getDb()) {}

  async createUser(
    { email, password_hash }: CreateUserDto,
    tx?: IDbTransaction
  ): Promise<IUser> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [user] = await db<
        IUser[]
      >`INSERT INTO users (email, password_hash) VALUES (${email}, ${password_hash}) RETURNING *`;
      if (!user) {
        throw new CreateUserError();
      }
      return user;
    } catch (error) {
      logger.error({ err: error }, "Failed to create user record");
      const wrapped = new CreateUserError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getUserByEmail(
    { email }: GetUserByEmailDto,
    tx?: IDbTransaction
  ): Promise<IUser | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [user] = await db<
        IUser[]
      >`SELECT * FROM users WHERE email = ${email}`;
      return user ?? null;
    } catch (error) {
      logger.error({ err: error }, "Failed to get user record by email");
      const wrapped = new GetUserRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getUserById(
    { id }: GetUserByIdDto,
    tx?: IDbTransaction
  ): Promise<IUser | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [user] = await db<
        IUser[]
      >`SELECT * FROM users WHERE id = ${id}`;
      return user ?? null;
    } catch (error) {
      logger.error({ err: error, userId: id }, "Failed to get user record by id");
      const wrapped = new GetUserRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
}
