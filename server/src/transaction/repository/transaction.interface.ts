export interface ITransactionManager<TTx> {
  withTransaction<T>(fn: (tx: TTx) => T | Promise<T>): Promise<T>;
}

export type IDbTransaction = import("postgres").TransactionSql;
