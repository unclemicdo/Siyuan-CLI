import { Command } from "commander";
import {
  registerSystemCommands,
  type SystemApi,
  type SystemCommandDeps
} from "./commands/system.js";
import { createHttpClient, resolveConfig, SiyuanClient } from "./core/index.js";

export interface CliDeps extends SystemCommandDeps {}
export interface CliDepsInput {
  systemApi?: SystemApi;
  write?: (value: string) => boolean;
}

export function createCli(input: CliDepsInput = {}): Command {
  const deps = createDeps(input);
  const program = new Command().name("sy").description("Agent-first CLI for SiYuan Note");
  registerSystemCommands(program, deps);
  return program;
}

function createDeps(input: CliDepsInput): CliDeps {
  const systemApi = input.systemApi
    ? bindSystemApi(input.systemApi)
    : createDefaultSystemApi();

  return {
    systemApi,
    write: input.write ?? ((value) => process.stdout.write(value))
  };
}

function createDefaultSystemApi(): SystemApi {
  const request = async <T>(endpoint: string): Promise<T> => {
    const config = resolveConfig({ env: process.env });
    const http = createHttpClient(config);
    const client = new SiyuanClient(http);
    return client.post<T>(endpoint, {});
  };

  return {
    version: async () => request("/api/system/version"),
    bootProgress: async () => request("/api/system/bootProgress"),
    time: async () => request("/api/system/currentTime")
  };
}

function bindSystemApi(systemApi: SystemApi): SystemApi {
  return {
    version: systemApi.version.bind(systemApi),
    bootProgress: systemApi.bootProgress.bind(systemApi),
    time: systemApi.time.bind(systemApi)
  };
}
