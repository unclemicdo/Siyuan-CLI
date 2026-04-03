import { SiyuanCliError } from "./errors.js";
import type { ResolveConfigInput, SiyuanConfig } from "./types.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:6806";
const DEFAULT_TIMEOUT_MS = 15000;

export function resolveConfig(input: ResolveConfigInput = {}): SiyuanConfig {
  const env = input.env ?? process.env;

  const baseUrl = input.flags?.baseUrl ?? env.SIYUAN_BASE_URL ?? DEFAULT_BASE_URL;
  const tokenRaw = input.flags?.token ?? env.SIYUAN_TOKEN;
  const timeoutRaw = input.flags?.timeout ?? env.SIYUAN_TIMEOUT;
  const timeout = Number(timeoutRaw ?? DEFAULT_TIMEOUT_MS);
  const profile = input.flags?.profile ?? env.SIYUAN_PROFILE;
  const token = tokenRaw?.trim();

  if (!token) {
    throw new SiyuanCliError(
      "CONFIG_MISSING_TOKEN",
      "Missing SiYuan API token"
    );
  }

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new SiyuanCliError(
      "CONFIG_INVALID_TIMEOUT",
      "SiYuan timeout must be a positive number"
    );
  }

  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new SiyuanCliError(
      "CONFIG_INVALID_BASE_URL",
      "SiYuan base URL must be a valid http(s) URL"
    );
  }

  if (
    parsedBaseUrl.protocol !== "http:" &&
    parsedBaseUrl.protocol !== "https:"
  ) {
    throw new SiyuanCliError(
      "CONFIG_INVALID_BASE_URL",
      "SiYuan base URL must be a valid http(s) URL"
    );
  }

  return {
    baseUrl: parsedBaseUrl.toString().replace(/\/$/, ""),
    token,
    timeout,
    profile
  };
}
