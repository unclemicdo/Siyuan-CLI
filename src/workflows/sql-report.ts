export interface SqlReportApi {
  query: (stmt: string) => Promise<unknown[]>;
}

export async function sqlReport(
  api: SqlReportApi,
  stmt: string
): Promise<{ rowCount: number; rows: unknown[] }> {
  const rows = await api.query(stmt);
  return {
    rowCount: rows.length,
    rows
  };
}
