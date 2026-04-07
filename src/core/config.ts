import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SiyuanCliError } from "./errors.js";
import type { ResolveConfigInput, SiyuanConfig } from "./types.js";

const DEFAULT_BASE_URL = "http://127.0.0.1:6806";
const DEFAULT_TIMEOUT_MS = 15000;

interface ConfigFileShape {
  defaultProfile?: string;
  profiles?: Record<
    string,
    {
      baseUrl?: string;
      token?: string;
      timeout?: number;
    }
  >;
}

export function resolveConfig(input: ResolveConfigInput = {}): SiyuanConfig {
  const env = input.env ?? process.env;
  const envBaseUrl = normalizeOptionalEnvString(env.SIYUAN_BASE_URL);
  const envToken = normalizeOptionalEnvString(env.SIYUAN_TOKEN);
  const envTimeout = normalizeOptionalEnvString(env.SIYUAN_TIMEOUT);
  const fileConfig = readConfigFile(input.configFilePath);
  const requestedProfile =
    input.flags?.profile ?? env.SIYUAN_PROFILE ?? fileConfig.defaultProfile;
  const profileConfig = requestedProfile
    ? fileConfig.profiles?.[requestedProfile]
    : undefined;

  const baseUrl =
    input.flags?.baseUrl ??
    envBaseUrl ??
    profileConfig?.baseUrl ??
    DEFAULT_BASE_URL;
  const tokenRaw = envToken ?? profileConfig?.token;
  const timeoutRaw =
    input.flags?.timeout ??
    envTimeout ??
    profileConfig?.timeout;
  const timeout = Number(timeoutRaw ?? DEFAULT_TIMEOUT_MS);
  const profile = requestedProfile;
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

function readConfigFile(configFilePath = getDefaultConfigFilePath()): ConfigFileShape {
  if (!existsSync(configFilePath)) {
    return {};
  }

  try {
    const raw = readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(raw) as ConfigFileShape;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new SiyuanCliError(
      "CONFIG_INVALID_FILE",
      "Failed to read SiYuan CLI config file",
      { configFilePath }
    );
  }
}

function getDefaultConfigFilePath(): string {
  const xdgConfigHome = normalizeOptionalEnvString(process.env.XDG_CONFIG_HOME);
  const configRoot = xdgConfigHome ?? join(homedir(), ".config");
  return join(configRoot, "siyuan-cli", "config.json");
}

function normalizeOptionalEnvString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
