export interface BlockBatchApi {
  appendBlock: (input: unknown) => Promise<unknown>;
  updateBlock: (input: unknown) => Promise<unknown>;
}

export interface BlockBatchOperation {
  op: "append" | "update";
  payload: unknown;
}

export async function blockBatch(
  api: BlockBatchApi,
  operations: BlockBatchOperation[]
): Promise<{
  results: Array<
    | { op: "append" | "update"; ok: true; data: unknown }
    | { op: "append" | "update"; ok: false; error: { message: string } }
  >;
}> {
  const results: Array<
    | { op: "append" | "update"; ok: true; data: unknown }
    | { op: "append" | "update"; ok: false; error: { message: string } }
  > = [];

  for (const operation of operations) {
    try {
      const data =
        operation.op === "append"
          ? await api.appendBlock(operation.payload)
          : await api.updateBlock(operation.payload);

      results.push({ op: operation.op, ok: true, data });
    } catch (error) {
      results.push({
        op: operation.op,
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Unexpected error"
        }
      });
    }
  }

  return { results };
}
