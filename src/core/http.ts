import axios, { type AxiosInstance } from "axios";
import type { SiyuanConfig } from "./types.js";

export function createHttpClient(config: SiyuanConfig): AxiosInstance {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      Authorization: `Token ${config.token}`,
      "Content-Type": "application/json"
    }
  });
}
