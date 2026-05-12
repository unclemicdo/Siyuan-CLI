import { readFile } from "node:fs/promises";
import { basename } from "node:path";
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

  async removeDoc(id: string, force?: boolean): Promise<unknown> {
    return this.post("/api/filetree/removeDocByID", {
      id,
      ...(typeof force === "boolean" ? { force } : {})
    });
  }

  async getHPathByPath(payload: {
    notebook?: string;
    path: string;
  }): Promise<unknown> {
    return this.post("/api/filetree/getHPathByPath", payload);
  }

  async getHPathByID(id: string): Promise<unknown> {
    return this.post("/api/filetree/getHPathByID", { id });
  }

  async exportMarkdown(id: string): Promise<unknown> {
    return this.post("/api/export/exportMdContent", { id });
  }

  async exportResources(payload: {
    paths: string[];
    name?: string;
  }): Promise<unknown> {
    return this.post("/api/export/exportResources", payload);
  }

  async getBlockKramdown(id: string): Promise<unknown> {
    return this.post("/api/block/getBlockKramdown", { id });
  }

  async getBlockInfo(id: string): Promise<unknown> {
    return this.post("/api/block/getBlockInfo", { id });
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

  async getAttributeView(id: string): Promise<unknown> {
    return this.post("/api/av/getAttributeView", { id });
  }

  async getAttributeViewKeysByAvID(avID: string): Promise<unknown> {
    return this.post("/api/av/getAttributeViewKeysByAvID", { avID });
  }

  async renderAttributeView(payload: {
    id: string;
    viewID?: string;
    blockID?: string;
    query?: string;
    page?: number;
    pageSize?: number;
    groupPaging?: Record<string, unknown>;
    createIfNotExist?: boolean;
  }): Promise<unknown> {
    return this.post("/api/av/renderAttributeView", payload);
  }

  async setAttributeViewBlockAttr(payload: {
    avID: string;
    keyID: string;
    rowID: string;
    value: unknown;
    valueType?: string;
  }): Promise<unknown> {
    return this.post("/api/av/setAttributeViewBlockAttr", payload);
  }

  async addAttributeViewKey(payload: {
    avID: string;
    keyID: string;
    keyName: string;
    keyType: string;
    keyIcon?: string;
    previousKeyID?: string;
  }): Promise<unknown> {
    return this.post("/api/av/addAttributeViewKey", payload);
  }

  async updateAttributeViewKey(payload: {
    avID: string;
    keyID: string;
    keyName?: string;
    keyType?: string;
    keyIcon?: string;
    previousKeyID?: string;
  }): Promise<unknown> {
    return this.postAllowingEmptyBody("/api/av/updateAttributeViewKey", payload);
  }

  async removeAttributeViewKey(payload: {
    avID: string;
    keyID: string;
    removeRelationDest?: boolean;
  }): Promise<unknown> {
    return this.post("/api/av/removeAttributeViewKey", payload);
  }

  async getTags(payload: {
    sort?: number;
    app: string;
    ignoreMaxListHint: boolean;
  }): Promise<unknown> {
    return this.post("/api/tag/getTag", payload);
  }

  async renameTag(oldLabel: string, newLabel: string): Promise<unknown> {
    return this.post("/api/tag/renameTag", { oldLabel, newLabel });
  }

  async removeTag(label: string): Promise<unknown> {
    return this.post("/api/tag/removeTag", { label });
  }

  async renderTemplate(payload: {
    id: string;
    path: string;
    preview?: boolean;
  }): Promise<unknown> {
    return this.post("/api/template/render", payload);
  }

  async renderSprig(payload: {
    template: string;
  }): Promise<unknown> {
    return this.post("/api/template/renderSprig", payload);
  }

  async uploadAsset(payload: {
    filePath: string;
    uploadName?: string;
  }): Promise<unknown> {
    const fileBytes = await readFile(payload.filePath);
    const fileName = payload.uploadName?.trim() || basename(payload.filePath);
    const formData = new FormData();
    formData.append(
      "file[]",
      new File([fileBytes], fileName),
      fileName
    );

    return this.post("/api/asset/upload", formData, {
      headers: {
        // Let the runtime/adapter set the multipart boundary instead of the default JSON header.
        "Content-Type": undefined
      }
    });
  }

  async setDocTags(id: string, tags: string): Promise<unknown> {
    return this.setBlockAttrs(id, { tags });
  }

  async refreshBacklink(id: string): Promise<unknown> {
    return this.post("/api/ref/refreshBacklink", { id });
  }

  async getBacklink(payload: {
    id: string;
    k: string;
    mk: string;
    beforeLen: number;
    containChildren?: boolean;
  }): Promise<unknown> {
    return this.post("/api/ref/getBacklink", payload);
  }

  async getBacklinkDoc(payload: {
    defID: string;
    refTreeID: string;
    keyword: string;
    containChildren?: boolean;
    highlight?: boolean;
  }): Promise<unknown> {
    return this.post("/api/ref/getBacklinkDoc", payload);
  }

  async getBackmentionDoc(payload: {
    defID: string;
    refTreeID: string;
    keyword: string;
    containChildren?: boolean;
    highlight?: boolean;
  }): Promise<unknown> {
    return this.post("/api/ref/getBackmentionDoc", payload);
  }

  async transferBlockRef(payload: {
    fromID: string;
    toID: string;
    refIDs?: string[];
  }): Promise<unknown> {
    return this.post("/api/block/transferBlockRef", payload);
  }

  async getGraph(payload: {
    k: string;
    conf: Record<string, unknown>;
    reqId: string;
  }): Promise<unknown> {
    return this.post("/api/graph/getGraph", payload);
  }

  async getLocalGraph(payload: {
    id: string;
    k: string;
    conf: Record<string, unknown>;
    reqId: string;
  }): Promise<unknown> {
    return this.post("/api/graph/getLocalGraph", payload);
  }

  async resetGraph(): Promise<unknown> {
    return this.post("/api/graph/resetGraph", {});
  }

  async resetLocalGraph(): Promise<unknown> {
    return this.post("/api/graph/resetLocalGraph", {});
  }

  async querySql(stmt: string): Promise<unknown> {
    return this.post("/api/query/sql", { stmt });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    config?: { headers?: Record<string, string | undefined> }
  ): Promise<T> {
    try {
      const response = config
        ? await this.http.post<SiyuanEnvelope<T>>(endpoint, body, config)
        : await this.http.post<SiyuanEnvelope<T>>(endpoint, body);
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

  async postAllowingEmptyBody<T>(endpoint: string, body: unknown): Promise<T> {
    try {
      const response = await this.http.post<SiyuanEnvelope<T> | string>(endpoint, body);
      if (response.data === "") {
        return null as T;
      }

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
