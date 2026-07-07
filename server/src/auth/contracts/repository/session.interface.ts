import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import { ISession } from "@/auth/domain/session.domain.ts";
import { SessionDTO, UpdateSessionDTO } from "@/auth/dto/auth.dto.ts";

export interface ISessionRepository {
  createSession(session: SessionDTO, tx?: IDbTransaction): Promise<void>;
  checkRefreshToken(token: string, tx?: IDbTransaction): Promise<ISession | null>;
  getSessionById(id: string, tx?: IDbTransaction): Promise<ISession | null>;
  updateSession(session: UpdateSessionDTO, tx?: IDbTransaction): Promise<void>;
  deleteSession(userId: string, tx?: IDbTransaction): Promise<void>;
}
