export interface DocUpsertApi {
  resolvePath: (path: string) => Promise<{ id: string } | null>;
  createDoc: (input: {
    notebook: string;
    path: string;
    markdown?: string;
  }) => Promise<{ id: string }>;
  appendBlock: (input: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }) => Promise<unknown>;
}

export interface DocUpsertInput {
  notebook: string;
  path: string;
  append?: string;
}

export async function docUpsert(
  api: DocUpsertApi,
  input: DocUpsertInput
): Promise<{ docId: string; created: boolean }> {
  const existing = await api.resolvePath(input.path);
  const doc =
    existing ??
    (await api.createDoc({ notebook: input.notebook, path: input.path }));

  if (input.append) {
    await api.appendBlock({
      parentID: doc.id,
      data: input.append,
      dataType: "markdown"
    });
  }

  return { docId: doc.id, created: !existing };
}
