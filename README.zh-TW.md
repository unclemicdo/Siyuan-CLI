# Siyuan CLI

[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

面向 SiYuan Note、以 Agent 為優先的 TypeScript CLI。

Siyuan CLI 在 SiYuan 的 HTTP API 之上提供了一層穩定的命令列封裝。它適合那些希望自動化筆記操作、執行可重複腳本，或讓 AI Agent 以更安全、更可預測方式處理 SiYuan 內容的人。

## 為什麼使用 Siyuan CLI

如果你主要是在 SiYuan 裡手動寫作和編輯，圖形介面通常已經夠用。Siyuan CLI 真正有價值的時刻，是某個筆記動作不再只是偶爾做一次，而是開始反覆出現，逐漸變成一條固定流程。

對一般 SiYuan 使用者來說，這通常意味著把「建立今天的日報」「把會後結論追加到專案文件」「匯出一篇文件」這類重複動作，收斂成一條隨時可重複使用的命令。

對自動化與 Agent 使用者來說，這意味著腳本或本地 AI 工具可以用一種更穩定、更可預測的方式讀取與更新 SiYuan 內容，而不需要自己手動拼接原始 HTTP 請求。

它帶來的實際價值通常是：

- 少做重複點擊，把時間留給真正的記錄與整理
- 讓日報、會議紀要、專案更新這類固定流程每次都保持一致
- 可以從終端、shell 腳本、cron 任務、快捷指令或本地工具直接觸發筆記操作
- 回傳穩定的 JSON 輸出，更容易接入自動化流程與 Agent 工作流
- 相比直接呼叫原始 SiYuan HTTP API，命令更清楚，預設行為也更安全

最近新增的能力也值得一提：Siyuan CLI 現在已經覆蓋 AV / 資料庫工作流、官方範本渲染、面向 Agent 產物的安全託管檔案暫存、直接資源上傳、路徑 / ID 輔助查詢，以及文件關聯資源匯出。目標是讓 Agent 和腳本透過穩定的產品命令處理更多真實 SiYuan 工作流，而不是退回到原始 SQL 寫入或臨時檔案系統操作；這些新增能力也讓自動化寫入邊界更明確、更安全。

## 常見使用場景

人們通常會在下面這些時刻用到 Siyuan CLI：

- 每天開始工作時，先建立一篇帶日期的日誌、日報或站會筆記，並自動帶上固定範本。
- 一場會議或通話結束後，立刻把總結與待辦追加到正確的專案文件裡，避免上下文遺失。
- 當一篇文件需要離開 SiYuan 時，把它匯出為 Markdown，用於分享、備份、發布，或交給其他工具繼續處理。
- 當腳本或 Agent 需要穩定上下文時，先把人類可讀路徑解析成真實文件 ID，後續命令就能一直重用。
- 當你要一次整理或分析很多筆記時，用批次 block 操作或 SQL 查詢取代逐篇手動編輯。
- 當 SiYuan 要接入本地自動化流程時，讓腳本或 Agent 讀筆記、寫更新、出報告都變得更可控。

## 快速示例

下面的示例預設你已經透過匯出的環境變數或設定檔配置好了 token。不要把 token 以内聯形式直接寫在命令列裡。

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

先看目前有哪些筆記本可用：

```bash
sy notebook list --json
```

建立一篇新文件——透過 stdin heredoc 輸入內容（無需 shell 跳脫、無 ARG_MAX 限制）：

```bash
sy doc create --notebook nb-1 --path /Projects/MyDoc --json <<'EOF'
# 新文件

內容可包含 `code`、$HOME、"引號"——全部安全。
EOF
```

如果內容已存在於檔案中，改用 `--markdown-file`。

給現有文件追加內容：

```bash
sy block append --parent-id doc-1 --json <<'EOF'
## 跟進

- [ ] 待辦事項 1
- [ ] 待辦事項 2
EOF
```

給文件設定標籤：

```bash
sy tag set-doc --id doc-1 --tags "AI Agent,PDCA" --json
```

用 SQL 查詢筆記：

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

透過 REPL 互動式探索命令：

```bash
sy repl
```

## 執行要求

- Node.js `>=22.10.0`
- 一個可存取的 SiYuan HTTP API 端點
- 一個 SiYuan API token

## 安裝

```bash
npm install -g @unclemicdo/siyuan-cli
```

然後執行：

```bash
sy system version --json
```

如果是本地開發，克隆倉庫後使用 `npm run dev`。

`sy` 命令需要 Node.js `>=22.10.0` 並提前配置好 SiYuan token 和 base URL。

## Agent Skill

這個倉庫也內建了一個隨版本一起維護的 `siyuan-cli` skill，可供 Codex 與 Claude Code 使用。

共享來源目錄：

- `skills/siyuan-cli/`

全域安裝：

- 將 `skills/siyuan-cli/` 視為唯一事實來源
- 在本地開發環境中，優先把全域 skill 安裝為指向這個目錄的符號連結
- 顯式指定目標 skill 根目錄，例如 `~/.codex/skills` 或 `~/.claude/skills`
- 如果機器上不適合使用符號連結，也可以改用複製模式

安裝或刷新全域 skill：

```bash
npm run skill:install -- --target-dir ~/.codex/skills --force
```

常見變體：

```bash
npm run skill:install -- --mode copy --target-dir ~/.codex/skills --force
npm run skill:install -- --target-dir ~/.claude/skills --force
```

使用方式：

- 當你希望 agent 透過這個 CLI 操作 SiYuan 時，可以直接要求它使用 `siyuan-cli` skill
- 當需求涉及選命令、預設使用 `--json`、路徑轉 id，或處理 `CONFIG_*`、`API_*`、`SQL_*` 錯誤時，優先使用它

## 首次設定

在這個 CLI 能夠連接到 SiYuan 之前，你需要準備兩項資訊：

- 一個 SiYuan API token
- SiYuan API base URL

如果你的 SiYuan 實例執行在預設本地位址上，base URL 通常是：

```text
http://127.0.0.1:6806
```

這種情況下，你通常只需要提供 token。

### 方式 A：使用環境變數

這是最快的入門方式：

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

然後執行：

```bash
sy system version --json
```

### 方式 B：使用設定檔

如果你會經常使用這個 CLI，通常這種方式會更合適。

預設設定檔路徑：

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

然後執行：

```bash
sy system version --json
```

### 設定規則

可選環境變數：

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

全域參數：

- `--base-url`
- `--timeout`
- `--profile`

預設值：

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

設定優先順序：

1. 顯式 CLI 參數 `baseUrl`、`timeout` 和 `profile`
2. 環境變數
3. 設定檔
4. 內建預設值

token 解析優先順序：

1. `SIYUAN_TOKEN`
2. 設定檔 profile 中的 token

空字串環境變數會被視為未設定，並回退到下一個來源。

## 可用命令

目前已實作的子命令：

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

所有已實作命令都支援 `--json`。

成功輸出結構：

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

失敗輸出結構：

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

啟動互動式 shell：

```bash
sy repl
```

輸入 `exit` 或 `quit` 退出。

REPL 會轉送一般 CLI 命令，並支援常見的 doc 和 block 上下文繼承（`--notebook`、`--path`、`--id`、`--parent-id`），避免連續命令中重複輸入。

目前的 REPL 是刻意保持輕量的。它會轉送一般 CLI 命令，只額外增加少量基於上下文的 flag 自動注入。

內建的 REPL 輔助命令：

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

`doc resolve-path` 支援以下兩種路徑風格：

- 已儲存的 SiYuan `hpath`，例如 `/Projects/Doc`
- 帶筆記本前綴的同一路徑，例如 `/Notebook/Projects/Doc`

## 目前限制

- REPL 的上下文注入只覆蓋常見的 doc 和 block 參數，它不是一個通用 shell 層。
- 當目標離線或狀態異常時，會回傳結構化的 `API_*` 錯誤，但命令仍然會以非零狀態退出。

## 致謝

這個專案的設計與實作參考了 SiYuan 倉庫與 SiYuan API 文件：

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

本專案使用 MIT License。詳見 [LICENSE](./LICENSE)。
