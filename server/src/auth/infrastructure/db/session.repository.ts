import { getDb } from "@/shared/db/postgres.ts";
import { ISession } from "@/auth/domain/session.domain.ts";
import { ISessionRepository } from "@/auth/contracts/repository/session.interface.ts";
import { SessionDTO, UpdateSessionDTO } from "@/auth/dto/auth.dto.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import postgres from "postgres";
import {
  CreateSessionError,
  DeleteSessionError,
  GetSessionRecordError,
  InvalidRefreshTokenError,
  UpdateSessionError,
} from "@/auth/error/errors.ts";
import { logger, markLogged } from "@/shared/logger/logger.ts";

type DbExecutor = postgres.Sql;

export class SessionRepository implements ISessionRepository {
  constructor(private readonly sql = getDb()) {}

  async createSession(session: SessionDTO, tx?: IDbTransaction): Promise<void> {
    try {
      const db = (tx ?? this.sql) as DbExecutor;
      await db<
        ISession[]
      >`INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES
    ( ${session.id}, ${session.user_id}, ${session.token_hash}, ${session.expires_at})`;
    } catch (error) {
      logger.error(
        { err: error, sessionId: session.id, userId: session.user_id },
        "Failed to create session record"
      );
      const wrapped = new CreateSessionError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async checkRefreshToken(
    token: string,
    tx?: IDbTransaction
  ): Promise<ISession | null> {
    try {
      const db = (tx ?? this.sql) as DbExecutor;
      const [session] = await db<
        ISession[]
      >`SELECT * FROM sessions WHERE token_hash = ${token}`;
      return session ?? null;
    } catch (error) {
      logger.error({ err: error }, "Failed to look up session by token");
      const wrapped = new InvalidRefreshTokenError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getSessionById(
    id: string,
    tx?: IDbTransaction
  ): Promise<ISession | null> {
    try {
      const db = (tx ?? this.sql) as DbExecutor;
      const [session] = await db<
        ISession[]
      >`SELECT * FROM sessions WHERE id = ${id}`;
      return session ?? null;
    } catch (error) {
      logger.error(
        { err: error, sessionId: id },
        "Failed to get session record"
      );
      const wrapped = new GetSessionRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async updateSession(
    updateSession: UpdateSessionDTO,
    tx?: IDbTransaction
  ): Promise<void> {
    try {
      const db = (tx ?? this.sql) as DbExecutor;
      await db<
        ISession[]
      >`UPDATE sessions SET expires_at = ${updateSession.expires_at}, token_hash = ${updateSession.token_hash} WHERE id = ${updateSession.id}`;
    } catch (error) {
      logger.error(
        { err: error, sessionId: updateSession.id },
        "Failed to update session record"
      );
      const wrapped = new UpdateSessionError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async deleteSession(sessionId: string, tx?: IDbTransaction): Promise<void> {
    try {
      const db = (tx ?? this.sql) as DbExecutor;
      await db<ISession[]>`DELETE FROM sessions WHERE id = ${sessionId}`;
    } catch (error) {
      logger.error(
        { err: error, sessionId },
        "Failed to delete session record"
      );
      const wrapped = new DeleteSessionError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
}
