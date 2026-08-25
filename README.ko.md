# Siyuan CLI

[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

SiYuan Note를 위한 에이전트 우선 TypeScript CLI입니다.

Siyuan CLI는 SiYuan의 HTTP API 위에 안정적인 명령줄 레이어를 제공합니다. 반복 가능한 스크립트를 실행하거나, 노트 작업을 자동화하거나, AI 에이전트가 SiYuan 콘텐츠를 더 안전하고 예측 가능하게 다루도록 하려는 사람들을 위해 설계되었습니다.

## Siyuan CLI를 사용하는 이유

주로 SiYuan 안에서 직접 노트를 쓰고 편집한다면 GUI만으로도 충분한 경우가 많습니다. Siyuan CLI가 진가를 발휘하는 시점은 같은 노트 작업이 일회성 작업이 아니라 반복되는 워크플로가 될 때입니다.

일반적인 SiYuan 사용자에게는 "오늘의 노트 만들기", "회의 후속 내용 추가하기", "문서 내보내기" 같은 반복 작업을 믿고 재사용할 수 있는 하나의 명령으로 바꾸는 것을 의미합니다.

자동화와 에이전트 워크플로 측면에서는, 스크립트와 로컬 AI 도구가 원시 HTTP 요청을 직접 조합하지 않고도 안정적인 방식으로 SiYuan 콘텐츠를 읽고 쓸 수 있게 된다는 뜻입니다.

실제로 얻는 가치는 다음과 같습니다:

- 반복적인 노트 정리 작업에 쓰는 시간을 줄이고 실제 콘텐츠에 더 집중할 수 있습니다
- 일지, 회의록, 프로젝트 업데이트 같은 반복 워크플로를 일관되게 유지할 수 있습니다
- 터미널, 셸 스크립트, cron 작업, 단축키, 로컬 도구에서 노트 작업을 실행할 수 있습니다
- 자동화 및 에이전트 파이프라인에 자연스럽게 연결되는 안정적인 JSON 출력을 얻을 수 있습니다
- 원시 SiYuan HTTP API를 직접 호출하는 것보다 더 명확한 명령과 더 안전한 기본 동작을 사용할 수 있습니다

최근 추가된 기능도 주목할 만합니다. Siyuan CLI는 이제 AV / 데이터베이스 워크플로, 공식 템플릿 렌더링, 에이전트 산출물을 위한 안전한 관리형 파일 스테이징, 직접 에셋 업로드, 경로 / ID 보조 조회, 문서 연관 리소스 내보내기까지 다룹니다. 목표는 에이전트와 스크립트가 원시 SQL 쓰기나 임시 파일 시스템 접근으로 되돌아가지 않고도 더 많은 실제 SiYuan 워크플로를 안정적인 제품 명령으로 처리하게 하는 것이며, 이런 추가 기능은 자동화에서의 쓰기 경계도 더 명확하고 안전하게 만듭니다.

## 대표적인 사용 사례

사람들은 보통 다음과 같은 상황에서 Siyuan CLI를 사용합니다:

- 하루를 시작할 때 준비된 템플릿으로 날짜가 포함된 일지, 업무 로그, 스탠드업 노트를 만듭니다.
- 통화가 끝난 직후, 맥락을 잃기 전에 요약과 액션 아이템을 올바른 프로젝트 문서에 바로 추가합니다.
- 문서를 SiYuan 밖으로 꺼내야 할 때, 공유, 백업, 게시 또는 다른 도구로 넘기기 위해 Markdown으로 내보냅니다.
- 스크립트나 에이전트가 안정적인 컨텍스트를 필요로 할 때, 사람이 읽을 수 있는 경로를 한 번 실제 문서 ID로 변환하고 이후 명령에서 재사용합니다.
- 많은 노트를 한 번에 정리하거나 분석해야 할 때, 한 문서씩 편집하는 대신 블록 일괄 업데이트나 SQL 쿼리를 사용합니다.
- SiYuan이 로컬 워크플로의 일부일 때, 자동화나 에이전트가 예측 가능한 방식으로 노트를 읽고, 업데이트를 쓰고, 보고서를 만들도록 할 수 있습니다.

## 빠른 예제

아래 예제는 이미 export한 환경 변수나 설정 파일을 통해 토큰을 구성했다고 가정합니다. 토큰을 명령줄에 직접 인라인으로 넣지 마세요.

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

사용 가능한 노트북을 확인합니다:

```bash
sy notebook list --json
```

새 문서를 생성합니다 — stdin heredoc으로 내용 입력 (셸 이스케이프 불필요, ARG_MAX 제한 없음):

```bash
sy doc create --notebook nb-1 --path /Projects/MyDoc --json <<'EOF'
# 새 문서

`code`, $HOME, "따옴표"를 포함한 내용 — 모두 안전합니다.
EOF
```

내용이 이미 파일에 있다면 `--markdown-file`을 대신 사용하세요.

기존 문서에 내용을 추가합니다:

```bash
sy block append --parent-id doc-1 --json <<'EOF'
## 후속 조치

- [ ] 할 일 1
- [ ] 할 일 2
EOF
```

문서에 태그를 설정합니다:

```bash
sy tag set-doc --id doc-1 --tags "AI Agent,PDCA" --json
```

SQL로 노트를 조회합니다:

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

REPL로 명령을 대화형으로 탐색합니다:

```bash
sy repl
```

## 요구 사항

- Node.js `>=22.10.0`
- 접근 가능한 SiYuan HTTP API 엔드포인트
- SiYuan API 토큰

### SiYuan 버전 호환성

CLI는 안정적인 SiYuan API를 대상으로 하며 SiYuan 3.6.5 이상(3.8.1 포함)에서 동작합니다. 3.8.1에서 두 가지 AV 동작이 변경되었으며 CLI가 이미 대응하고 있습니다:

- `av set-cell`은 `itemID`(`--item-id` 플래그)를 전송합니다. SiYuan 3.8.1은 레거시 `rowID` 요청 필드를 거부합니다.
- `av update-key`는 `/api/transactions`(`updateAttrViewCol` / `setAttrViewColIcon`)를 통해 필드를 갱신하며, 등록된 적 없는 `/api/av/updateAttributeViewKey` 라우트는 사용하지 않습니다.

3.8.1 API 계약에 대한 CLI 수정: `doc create`는 항상 명시적 `markdown` 필드를 전송합니다(키가 없으면 SiYuan 3.8.1은 문서를 생성하지 않고 `data: null`을 반환). `av add-detached-rows`는 공식 `addAttributeViewBlocks` 계약에 따라 `itemID`(`--row-ids` 값)와 선택적 `--content` 기본 키 텍스트를 전송합니다.

## 설치

```bash
npm install -g @unclemicdo/siyuan-cli
```

그다음 실행합니다:

```bash
sy system version --json
```

로컬 개발의 경우 저장소를 클론하고 `npm run dev`를 사용하세요.

`sy` 명령은 Node.js `>=22.10.0` 과 미리 구성된 SiYuan token/base URL이 필요합니다.

## 에이전트 스킬

이 저장소에는 Codex 와 Claude Code 에서 사용할 수 있는 버전 관리형 `siyuan-cli` 스킬도 함께 들어 있습니다.

공용 원본 디렉터리:

- `skills/siyuan-cli/`

전역 설치:

- `skills/siyuan-cli/` 를 단일 원본으로 취급하세요
- 로컬 개발 환경에서는 전역 스킬을 이 디렉터리를 가리키는 심볼릭 링크로 설치하는 방식을 우선 권장합니다
- `~/.codex/skills` 또는 `~/.claude/skills` 같은 대상 skill 루트를 명시적으로 지정하세요
- 심볼릭 링크가 적합하지 않은 머신에서는 복사 모드도 사용할 수 있습니다

전역 스킬 설치 또는 갱신:

```bash
npm run skill:install -- --target-dir ~/.codex/skills --force
```

유용한 변형:

```bash
npm run skill:install -- --mode copy --target-dir ~/.codex/skills --force
npm run skill:install -- --target-dir ~/.claude/skills --force
```

사용:

- 이 CLI 를 통해 SiYuan 작업을 하게 하려면 에이전트에게 `siyuan-cli` 스킬을 명시적으로 사용하라고 요청하세요
- 명령 선택, `--json` 우선 사용, 경로를 id 로 해석, `CONFIG_*`, `API_*`, `SQL_*` 오류 복구가 필요할 때 우선 사용하세요

## 초기 설정

CLI가 SiYuan과 통신하기 전에 두 가지 정보가 필요합니다:

- SiYuan API 토큰
- SiYuan API 기본 URL

SiYuan 인스턴스가 기본 로컬 주소에서 실행 중이라면 기본 URL은 보통 다음과 같습니다:

```text
http://127.0.0.1:6806
```

이 경우에는 토큰만 제공하면 됩니다.

### 옵션 A: 환경 변수 사용

가장 빠르게 시작하는 방법입니다:

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

그다음 실행합니다:

```bash
sy system version --json
```

### 옵션 B: 설정 파일 사용

CLI를 자주 사용한다면 이 방법이 더 적합한 경우가 많습니다.

기본 설정 파일 경로:

```text
~/.config/siyuan-cli/config.json
```

예시:

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

그다음 실행합니다:

```bash
sy system version --json
```

### 설정 규칙

선택적 환경 변수:

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

전역 플래그:

- `--base-url`
- `--timeout`
- `--profile`

기본값:

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

설정 우선순위:

1. `baseUrl`, `timeout`, `profile` 에 대한 명시적 CLI 플래그
2. 환경 변수
3. 설정 파일
4. 내장 기본값

토큰 해석 우선순위:

1. `SIYUAN_TOKEN`
2. 설정 파일 프로필의 토큰

빈 문자열 환경 변수 값은 미설정으로 간주되며 다음 소스로 넘어갑니다.

## 사용 가능한 명령

현재 구현된 하위 명령:

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

## JSON 모드

구현된 모든 명령은 `--json` 을 지원합니다.

성공 출력 형식:

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

실패 출력 형식:

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

대화형 셸을 시작합니다:

```bash
sy repl
```

`exit` 또는 `quit` 으로 종료합니다.

REPL은 일반 CLI 명령을 전달하며 일반적인 doc 및 block 플래그 (`--notebook`, `--path`, `--id`, `--parent-id`)에 대한 컨텍스트 상속을 지원하여 연속된 명령에서 반복 입력을 피할 수 있습니다.

내장 REPL 도우미:

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

현재 컨텍스트 주입 범위는 의도적으로 좁습니다:

`doc resolve-path` 는 다음 두 가지 경로 형식을 모두 허용합니다:

- `/Projects/Doc` 와 같은 저장된 SiYuan `hpath`
- `/Notebook/Projects/Doc` 와 같이 앞에 노트북 세그먼트가 붙은 동일한 경로

## 현재 제한 사항

- REPL 컨텍스트 주입은 일반적인 doc 및 block 플래그에만 적용되며, 범용 셸 계층이 아닙니다.
- 대상이 오프라인이거나 비정상 상태이면 구조화된 `API_*` 실패를 반환하지만, 명령은 여전히 0이 아닌 종료 코드를 반환합니다.

## 감사의 말

이 프로젝트는 SiYuan 저장소와 SiYuan API 문서를 참고하여 만들었습니다:

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

이 프로젝트는 MIT License를 따릅니다. 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.
