export interface MysqlTenantLockClient {
  $queryRawUnsafe<TResult = unknown>(query: string, ...values: unknown[]): Promise<TResult>;
}

export async function withMysqlTenantLock<TResult>(
  client: MysqlTenantLockClient,
  globalTenantId: string,
  operation: () => Promise<TResult>,
): Promise<TResult> {
  const lockRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    "SELECT id FROM Assistant WHERE globalTenantId = ? ORDER BY createdAt, id LIMIT 1 FOR UPDATE",
    globalTenantId,
  );
  if (!lockRows[0]) {
    throw new Error("TENANT_LOCK_UNAVAILABLE");
  }
  return operation();
}
