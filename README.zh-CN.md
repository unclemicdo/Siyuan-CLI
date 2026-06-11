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

最近新增的能力也值得一提：Siyuan CLI 现在已经覆盖 AV / 数据库工作流、官方模板渲染、面向 Agent 产物的安全托管文件暂存、直接资源上传、路径 / ID 辅助查询，以及文档关联资源导出。目标是让 Agent 和脚本通过稳定的产品命令处理更多真实 SiYuan 工作流，而不是退回到原始 SQL 写入或临时文件系统操作；这些新增能力也让自动化写入边界更明确、更安全。

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
sy notebook list --json
```

创建一篇新文档——通过 stdin heredoc 输入内容（无需 shell 转义、无 ARG_MAX 限制）：

```bash
sy doc create --notebook nb-1 --path /Projects/MyDoc --json <<'EOF'
# 新文档

内容可以包含 `code`、$HOME、"引号"——全部安全。
EOF
```

如果内容已存在于文件中，改用 `--markdown-file`。

给现有文档追加内容：

```bash
sy block append --parent-id doc-1 --json <<'EOF'
## 跟进

- [ ] 待办事项 1
- [ ] 待办事项 2
EOF
```

给文档设置标签：

```bash
sy tag set-doc --id doc-1 --tags "AI Agent,PDCA" --json
```

用 SQL 查询笔记：

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

通过 REPL 交互式探索命令：

```bash
sy repl
```

## 运行要求

- Node.js `>=22.10.0`
- 一个可访问的 SiYuan HTTP API 端点
- 一个 SiYuan API token

## 安装

```bash
npm install -g @unclemicdo/siyuan-cli
```

然后运行：

```bash
sy system version --json
```

如果是本地开发，克隆仓库后使用 `npm run dev`。

`sy` 命令需要 Node.js `>=22.10.0` 并提前配置好 SiYuan token 和 base URL。

## Agent Skill

这个仓库还内置了一个随版本一起维护的 `siyuan-cli` skill，可用于 Codex 和 Claude Code。

共享源目录：

- `skills/siyuan-cli/`

全局安装：

- 将 `skills/siyuan-cli/` 视为唯一事实来源
- 在本地开发环境中，优先把全局 skill 安装为指向这个目录的软链接
- 显式指定目标 skill 根目录，例如 `~/.codex/skills` 或 `~/.claude/skills`
- 如果机器上不适合使用软链接，也可以改用复制模式

安装或刷新全局 skill：

```bash
npm run skill:install -- --target-dir ~/.codex/skills --force
```

常见变体：

```bash
npm run skill:install -- --mode copy --target-dir ~/.codex/skills --force
npm run skill:install -- --target-dir ~/.claude/skills --force
```

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
sy system version --json
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
sy system version --json
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

## 可用命令

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
- `tag list`
- `tag rename`
- `tag remove`
- `tag set-doc`
- `ref refresh`
- `ref backlinks`
- `ref doc-backlinks`
- `ref doc-backmentions`
- `ref transfer`
- `graph global`
- `graph local`
- `graph reset`
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
sy repl
```

输入 `exit` 或 `quit` 退出。

REPL 会转发普通 CLI 命令，并支持常见的 doc 和 block 上下文继承（`--notebook`、`--path`、`--id`、`--parent-id`），避免连续命令中重复输入。

内置的 REPL 辅助命令：

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

`doc resolve-path` 支持以下两种路径风格：

- 已存储的 SiYuan `hpath`，例如 `/Projects/Doc`
- 带笔记本前缀的同一路径，例如 `/Notebook/Projects/Doc`

## 当前限制

- REPL 的上下文注入只覆盖常见的 doc 和 block 参数，它不是一个通用 shell 层。
- 当目标离线或状态异常时，会返回结构化的 `API_*` 错误，但命令仍然会以非零状态退出。

## 致谢

这个项目的设计与实现参考了 SiYuan 仓库和 SiYuan API 文档：

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

本项目使用 MIT License。详见 [LICENSE](./LICENSE)。
