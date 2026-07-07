import postgres from "postgres";
import { getDb } from "@/shared/db/postgres.ts";
import { ITransactionManager } from "@/transaction/repository/transaction.interface.ts";
import { CustomError } from "@/shared/error/error.ts";
import { logger, markLogged } from "@/shared/logger/logger.ts";

export class PostgresTransactionManager
  implements ITransactionManager<postgres.TransactionSql>
{
  async withTransaction<T>(
    fn: (tx: postgres.TransactionSql) => T | Promise<T>,
  ): Promise<T> {
    const db = getDb();
    try {
      return (await db.begin((tx) => fn(tx))) as T;
    } catch (error) {
      // Errors thrown by repositories are already typed CustomErrors and were
      // logged at their origin. Anything else here (e.g. connection loss
      // during BEGIN/COMMIT/ROLLBACK) is a genuine transaction-level failure.
      if (!(error instanceof CustomError)) {
        logger.error({ err: error }, "Database transaction failed");
        markLogged(error);
      }
      throw error;
    }
  }
}