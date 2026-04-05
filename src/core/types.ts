export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface SiyuanConfig {
  baseUrl: string;
  token: string;
  timeout: number;
  profile?: string;
}

export interface SiyuanConfigFlags {
  baseUrl?: string;
  timeout?: number;
  profile?: string;
}

export interface ResolveConfigInput {
  flags?: SiyuanConfigFlags;
  env?: NodeJS.ProcessEnv;
  configFilePath?: string;
}

export interface CommandSuccess<T> {
  ok: true;
  command: string;
  data: T;
  meta: {
    duration_ms: number;
  };
}

export interface CommandFailure {
  ok: false;
  command: string;
  error: {
    code: string;
    message: string;
    details: JsonValue;
  };
}

export interface SiyuanEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}
