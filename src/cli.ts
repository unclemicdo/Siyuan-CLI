import { Command } from "commander";

export function createCli(): Command {
  return new Command().name("sy").description("Agent-first CLI for SiYuan Note");
}
