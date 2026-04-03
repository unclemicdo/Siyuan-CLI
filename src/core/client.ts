import { isAxiosError, type AxiosInstance } from "axios";
import { SiyuanCliError } from "./errors.js";
import type { SiyuanEnvelope } from "./types.js";

export class SiyuanClient {
  constructor(private readonly http: AxiosInstance) {}

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
