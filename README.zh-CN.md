# Siyuan CLI

[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

面向 SiYuan Note、以 Agent 为优先的 TypeScript CLI。

Siyuan CLI 在 SiYuan 的 HTTP API 之上提供了一层稳定的命令行封装。它适合那些希望自动化笔记操作、运行可重复脚本，或让 AI Agent 以更安全、更可预测方式处理 SiYuan 内容的人。

## 为什么使用 Siyuan CLI

如果你主要是在 SiYuan 里手动写作和编辑，图形界面通常已经够用。Siyuan CLI 真正有价值的时刻，是某个笔记动作不再只是偶尔做一次，而是开始反复出现，逐渐变成一条固定流程。

对普通 SiYuan 用户来说，这通常意味着把“创建今天的日报”“把会后结论追加到项目文档”“导出一篇文档”这类重复动作，收敛成一条随时可复用的命令。

对自动化和 Agent 用户来说，这意味着脚本或本地 AI 工具可以用一种更稳定、更可预测的方式读取和更新 SiYuan 内容，而不需要自己手动拼接原始 HTTP 请求。

它带来的实际价值通常是：

- 少做重复点击，把时间留给真正的记录和整理
- 让日报、会议纪要、项目更新这类固定流程每次都保持一致
- 可以从终端、shell 脚本、cron 任务、快捷指令或本地工具直接触发笔记操作
- 返回稳定的 JSON 输出，更容易接入自动化流程和 Agent 工作流
- 相比直接调用原始 SiYuan HTTP API，命令更清晰，默认行为也更安全

## 常见使用场景

人们通常会在下面这些时刻用到 Siyuan CLI：

- 每天开始工作时，先创建一篇带日期的日志、日报或站会笔记，并自动带上固定模板。
- 一场会议或通话结束后，立刻把总结和待办追加到正确的项目文档里，避免上下文丢失。
- 当一篇文档需要离开 SiYuan 时，把它导出为 Markdown，用于分享、备份、发布，或交给其他工具继续处理。
- 当脚本或 Agent 需要稳定上下文时，先把人类可读路径解析成真实文档 ID，后续命令就能一直复用。
- 当你要一次整理或分析很多笔记时，用批量 block 操作或 SQL 查询代替逐篇手动编辑。
- 当 SiYuan 要接入本地自动化流程时，让脚本或 Agent 读笔记、写更新、出报告都变得更可控。

## 快速示例

下面的示例默认你已经通过导出的环境变量或配置文件配置好了 token。不要把 token 以内联形式直接写到命令行里。

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

先看当前有哪些笔记本可用：

```bash
npm run dev -- notebook list --json
```

从终端创建一篇项目文档或日报：

```bash
npm run dev -- doc create --notebook nb-1 --path /Projects/Siyuan-CLI --markdown "# Hello" --json
```

开完会后，给现有文档追加一条跟进记录：

```bash
npm run dev -- block append --parent-id doc-1 --data "Follow-up note" --json
```

当你需要批量查看或整理内容时，先跑一条 SQL 查询：

```bash
npm run dev -- sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

把 SQL 结果整理成一个可继续处理的简单报告：

```bash
npm run dev -- workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
```

想边试边看时，可以直接进入 REPL：

```bash
printf '%s\n' 'exit' | npm run dev -- repl
```

## 运行要求

- Node.js `>=22.10.0`
- 一个可访问的 SiYuan HTTP API 端点
- 一个 SiYuan API token

## 安装

这个仓库当前更适合以源码方式使用。最可靠的安装方式是克隆仓库并在本地运行它。

### 1. 安装 Node.js

先检查系统里是否已经有 Node.js：

```bash
node -v
npm -v
```

如果没有，请先安装 Node.js 22.10.0 或更高版本。

### 2. 克隆仓库

```bash
git clone <your-repo-url>
cd Siyuan-CLI
```

### 3. 安装依赖

```bash
npm install
```

### 4. 构建 CLI

```bash
npm run build
```

这会在 `dist/` 中生成编译后的文件。

### 5. 选择运行方式

先通过导出的环境变量或配置文件设置 `SIYUAN_TOKEN`。对于第一次使用的用户，最简单的方式是通过 `npm run dev` 运行源码入口：

```bash
npm run dev -- system version --json
```

如果你在构建后希望机器上有一个本地 `sy` 命令：

```bash
npm link
sy system version --json
```

`npm link` 是可选的。如果你愿意，也可以一直使用 `npm run dev -- ...`。

## Agent Skill

这个仓库还内置了一个随版本一起维护的 `siyuan-cli` skill，可用于 Codex 和 Claude Code。

发现位置：

- 共享来源：`skills/siyuan-cli/`
- Codex 入口：`.codex/skills/siyuan-cli/`
- Claude Code 入口：`.claude/skills/siyuan-cli/`

安装方式：

- 不需要单独下载，这个 skill 就在仓库里
- 如果你的 agent 运行环境不会自动发现仓库内 skill，就把这些目录接入它的 skill 搜索路径，或复制到本地 skill 目录

使用方式：

- 当你希望 agent 通过这个 CLI 操作 SiYuan 时，可以直接要求它使用 `siyuan-cli` skill
- 当需求涉及选命令、默认使用 `--json`、路径转 id，或处理 `CONFIG_*`、`API_*`、`SQL_*` 错误时，优先使用它

## 首次配置

在这个 CLI 能够连接到 SiYuan 之前，你需要准备两项信息：

- 一个 SiYuan API token
- SiYuan API base URL

如果你的 SiYuan 实例运行在默认本地地址上，base URL 通常是：

```text
http://127.0.0.1:6806
```

这种情况下，你通常只需要提供 token。

### 方式 A：使用环境变量

这是最快的入门方式：

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

然后运行：

```bash
npm run dev -- system version --json
```

### 方式 B：使用配置文件

如果你会经常使用这个 CLI，通常这种方式会更合适。

默认配置文件路径：

```text
~/.config/siyuan-cli/config.json
```

示例：

```json
{
  "defaultProfile": "local",
  "profiles": {
    "local": {
      "baseUrl": "http://127.0.0.1:6806",
      "token": "local-token",
      "timeout": 15000
    }
  }
}
```

然后运行：

```bash
npm run dev -- system version --json
```

### 配置规则

可选环境变量：

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

全局参数：

- `--base-url`
- `--timeout`
- `--profile`

默认值：

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

配置优先级：

1. 显式 CLI 参数 `baseUrl`、`timeout` 和 `profile`
2. 环境变量
3. 配置文件
4. 内置默认值

token 解析优先级：

1. `SIYUAN_TOKEN`
2. 配置文件 profile 中的 token

空字符串环境变量会被视为未设置，并回退到下一个来源。

## 目前可以做什么

顶层命令：

- `system`
- `notebook`
- `doc`
- `block`
- `attr`
- `sql`
- `workflow`
- `repl`

当前已实现的子命令：

- `system version`
- `system boot-progress`
- `system time`
- `notebook list`
- `notebook create`
- `notebook open`
- `notebook close`
- `doc create`
- `doc rename`
- `doc move`
- `doc remove`
- `doc export-md`
- `doc resolve-path`
- `block get`
- `block children`
- `block append`
- `block prepend`
- `block insert-before`
- `block insert-after`
- `block update`
- `block remove`
- `attr get`
- `attr set`
- `sql query`
- `sql explain-safety`
- `workflow doc-upsert`
- `workflow block-batch`
- `workflow sql-report`

## JSON 模式

所有已实现命令都支持 `--json`。

成功输出结构：

```json
{
  "ok": true,
  "command": "system.version",
  "data": "3.1.0",
  "meta": {
    "duration_ms": 12
  }
}
```

失败输出结构：

```json
{
  "ok": false,
  "command": "sql.query",
  "error": {
    "code": "SQL_UNSAFE",
    "message": "Only SELECT read-only queries are allowed",
    "details": {}
  }
}
```

## REPL

启动交互式 shell：

```bash
npm run dev -- repl
```

输入 `exit` 或 `quit` 退出。

当前的 REPL 是有意保持轻量的。它会转发普通 CLI 命令，只额外增加少量基于上下文的 flag 自动注入。

内置的 REPL 辅助命令：

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

当前支持的上下文注入范围刻意保持得很窄：

- `workflow doc-upsert` 可以继承 `--notebook` 和 `--path`
- `doc create` 可以继承 `--notebook`
- `doc export-md`、`doc remove` 和 `doc rename` 可以继承 `--id`
- `doc resolve-path` 可以继承 `--path`
- `block get`、`block children`、`block update` 和 `block remove` 可以继承 `--id`
- `block append` 和 `block prepend` 可以继承 `--parent-id`

其他命令仍然只是普通透传，必须显式传入对应 flag。

`doc resolve-path` 支持以下两种路径风格：

- 已存储的 SiYuan `hpath`，例如 `/Projects/Doc`
- 带笔记本前缀的同一路径，例如 `/Notebook/Projects/Doc`

## 当前限制

- REPL 的上下文注入只覆盖上面列出的命令与参数组合，它不是一个通用 shell 层。
- 当目标离线或状态异常时，会返回结构化的 `API_*` 错误，但命令仍然会以非零状态退出。

## 致谢

这个项目的设计与实现参考了 SiYuan 仓库和 SiYuan API 文档：

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

本项目使用 MIT License。详见 [LICENSE](./LICENSE)。
