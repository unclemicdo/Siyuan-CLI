import { isAxiosError, type AxiosInstance } from "axios";
import { SiyuanCliError } from "./errors.js";
import type { SiyuanEnvelope } from "./types.js";

export class SiyuanClient {
  constructor(private readonly http: AxiosInstance) {}

  async version(): Promise<unknown> {
    return this.post("/api/system/version", {});
  }

  async bootProgress(): Promise<unknown> {
    return this.post("/api/system/bootProgress", {});
  }

  async time(): Promise<unknown> {
    return this.post("/api/system/currentTime", {});
  }

  async listNotebooks(): Promise<unknown> {
    return this.post("/api/notebook/lsNotebooks", {});
  }

  async createNotebook(name: string): Promise<unknown> {
    return this.post("/api/notebook/createNotebook", { name });
  }

  async openNotebook(notebook: string): Promise<unknown> {
    return this.post("/api/notebook/openNotebook", { notebook });
  }

  async closeNotebook(notebook: string): Promise<unknown> {
    return this.post("/api/notebook/closeNotebook", { notebook });
  }

  async createDoc(payload: {
    notebook: string;
    path: string;
    markdown?: string;
  }): Promise<unknown> {
    return this.post("/api/filetree/createDocWithMd", payload);
  }

  async renameDoc(id: string, title: string): Promise<unknown> {
    return this.post("/api/filetree/renameDocByID", { id, title });
  }

  async moveDocs(fromIDs: string[], toID: string): Promise<unknown> {
    return this.post("/api/filetree/moveDocsByID", { fromIDs, toID });
  }

  async removeDoc(id: string): Promise<unknown> {
    return this.post("/api/filetree/removeDocByID", { id });
  }

  async exportMarkdown(id: string): Promise<unknown> {
    return this.post("/api/export/exportMdContent", { id });
  }

  async getBlockKramdown(id: string): Promise<unknown> {
    return this.post("/api/block/getBlockKramdown", { id });
  }

  async appendBlock(payload: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }): Promise<unknown> {
    return this.post("/api/block/appendBlock", payload);
  }

  async prependBlock(payload: {
    parentID: string;
    data: string;
    dataType: "markdown" | "dom";
  }): Promise<unknown> {
    return this.post("/api/block/prependBlock", payload);
  }

  async insertBlock(payload: {
    nextID?: string;
    previousID?: string;
    parentID?: string;
    data: string;
    dataType: "markdown" | "dom";
  }): Promise<unknown> {
    return this.post("/api/block/insertBlock", payload);
  }

  async updateBlock(payload: {
    id: string;
    data: string;
    dataType: "markdown" | "dom";
  }): Promise<unknown> {
    return this.post("/api/block/updateBlock", payload);
  }

  async getChildBlocks(id: string): Promise<unknown> {
    return this.post("/api/block/getChildBlocks", { id });
  }

  async deleteBlock(id: string): Promise<unknown> {
    return this.post("/api/block/deleteBlock", { id });
  }

  async getBlockAttrs(id: string): Promise<unknown> {
    return this.post("/api/attr/getBlockAttrs", { id });
  }

  async setBlockAttrs(id: string, attrs: Record<string, unknown>): Promise<unknown> {
    return this.post("/api/attr/setBlockAttrs", { id, attrs });
  }

  async querySql(stmt: string): Promise<unknown> {
    return this.post("/api/query/sql", { stmt });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    try {
      const response = await this.http.post<SiyuanEnvelope<T>>(endpoint, body);
      const envelope = response.data;

      if (!isEnvelope(envelope)) {
        throw new SiyuanCliError(
          "API_INVALID_RESPONSE",
          "SiYuan API returned an invalid response envelope",
          { endpoint }
        );
      }

      if (envelope.code !== 0) {
        throw new SiyuanCliError("API_RESPONSE_ERROR", envelope.msg, {
          endpoint,
          response_code: envelope.code
        });
      }

      return envelope.data;
    } catch (error) {
      if (error instanceof SiyuanCliError) {
        throw error;
      }

      if (isAxiosError(error)) {
        throw new SiyuanCliError(
          "API_NETWORK_ERROR",
          "Failed to reach SiYuan API",
          {
            endpoint,
            status: error.response?.status ?? null,
            axios_code: error.code ?? null
          }
        );
      }

      throw new SiyuanCliError(
        "API_NETWORK_ERROR",
        "Failed to reach SiYuan API",
        { endpoint }
      );
    }
  }
}

function isEnvelope<T>(value: unknown): value is SiyuanEnvelope<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SiyuanEnvelope<T>>;
  return (
    typeof candidate.code === "number" &&
    typeof candidate.msg === "string" &&
    Object.prototype.hasOwnProperty.call(candidate, "data")
  );
}
