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
npm run dev -- notebook list --json
```

從終端建立一篇專案文件或日報：

```bash
npm run dev -- doc create --notebook nb-1 --path /Projects/Siyuan-CLI --markdown "# Hello" --json
```

開完會後，給既有文件追加一條跟進記錄：

```bash
npm run dev -- block append --parent-id doc-1 --data "Follow-up note" --json
```

當你需要批次查看或整理內容時，先跑一條 SQL 查詢：

```bash
npm run dev -- sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

把 SQL 結果整理成一份可繼續處理的簡單報告：

```bash
npm run dev -- workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
```

想邊試邊看時，可以直接進入 REPL：

```bash
printf '%s\n' 'exit' | npm run dev -- repl
```

## 執行要求

- Node.js `>=22.10.0`
- 一個可存取的 SiYuan HTTP API 端點
- 一個 SiYuan API token

## 安裝

這個倉庫目前更適合以原始碼方式使用。最可靠的安裝方式是複製倉庫並在本地執行它。

### 1. 安裝 Node.js

先檢查系統裡是否已經有 Node.js：

```bash
node -v
npm -v
```

如果沒有，請先安裝 Node.js 22.10.0 或更高版本。

### 2. 複製倉庫

```bash
git clone https://github.com/unclemicdo/Siyuan-CLI
cd Siyuan-CLI
```

### 3. 安裝依賴

```bash
npm install
```

### 4. 建置 CLI

```bash
npm run build
```

這會在 `dist/` 中產生編譯後的檔案。

### 5. 選擇執行方式

先透過匯出的環境變數或設定檔設定 `SIYUAN_TOKEN`。對第一次使用的使用者來說，最簡單的方式是透過 `npm run dev` 執行原始碼入口：

```bash
npm run dev -- system version --json
```

如果你在建置後希望機器上有一個本地 `sy` 命令：

```bash
npm link
sy system version --json
```

`npm link` 是可選的。如果你願意，也可以一直使用 `npm run dev -- ...`。

## Agent Skill

這個倉庫也內建了一個隨版本一起維護的 `siyuan-cli` skill，可供 Codex 與 Claude Code 使用。

共享來源目錄：

- `skills/siyuan-cli/`

倉庫內相容入口：

- Codex：`.codex/skills/siyuan-cli/`
- Claude Code：`.claude/skills/siyuan-cli/`

手動安裝：

- 只複製 `skills/siyuan-cli/` 到你的本地 skill 目錄
- Codex 目標路徑：`~/.codex/skills/siyuan-cli/`
- Claude Code 目標路徑：`~/.claude/skills/siyuan-cli/`
- 不要單獨複製 `.codex/skills/siyuan-cli/` 或 `.claude/skills/siyuan-cli/`；它們只是倉庫內的輕量入口

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
npm run dev -- system version --json
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
npm run dev -- system version --json
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

## 目前可以做什麼

頂層命令：

- `system`
- `notebook`
- `doc`
- `block`
- `attr`
- `sql`
- `workflow`
- `repl`

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
npm run dev -- repl
```

輸入 `exit` 或 `quit` 退出。

目前的 REPL 是刻意保持輕量的。它會轉送一般 CLI 命令，只額外增加少量基於上下文的 flag 自動注入。

內建的 REPL 輔助命令：

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

目前支援的上下文注入範圍刻意保持得很窄：

- `workflow doc-upsert` 可以繼承 `--notebook` 和 `--path`
- `doc create` 可以繼承 `--notebook`
- `doc export-md`、`doc remove` 和 `doc rename` 可以繼承 `--id`
- `doc resolve-path` 可以繼承 `--path`
- `block get`、`block children`、`block update` 和 `block remove` 可以繼承 `--id`
- `block append` 和 `block prepend` 可以繼承 `--parent-id`

其他命令仍然只是一般透傳，必須顯式傳入對應 flag。

`doc resolve-path` 支援以下兩種路徑風格：

- 已儲存的 SiYuan `hpath`，例如 `/Projects/Doc`
- 帶筆記本前綴的同一路徑，例如 `/Notebook/Projects/Doc`

## 目前限制

- REPL 的上下文注入只覆蓋上面列出的命令與參數組合，它不是一個通用 shell 層。
- 當目標離線或狀態異常時，會回傳結構化的 `API_*` 錯誤，但命令仍然會以非零狀態退出。

## 致謝

這個專案的設計與實作參考了 SiYuan 倉庫與 SiYuan API 文件：

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

本專案使用 MIT License。詳見 [LICENSE](./LICENSE)。
