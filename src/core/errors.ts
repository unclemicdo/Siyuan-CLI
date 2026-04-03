import type { JsonValue } from "./types.js";

export class SiyuanCliError extends Error {
  public readonly code: string;
  public readonly details?: JsonValue;

  constructor(code: string, message: string, details?: JsonValue) {
    super(message);
    this.name = "SiyuanCliError";
    this.code = code;
    this.details = details;
  }
}
