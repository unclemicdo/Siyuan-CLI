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

작업을 시작하기 전에 사용 가능한 노트북을 확인합니다:

```bash
npm run dev -- notebook list --json
```

터미널에서 프로젝트 노트나 일일 노트를 만듭니다:

```bash
npm run dev -- doc create --notebook nb-1 --path /Projects/Siyuan-CLI --markdown "# Hello" --json
```

회의나 통화 후 후속 메모를 추가합니다:

```bash
npm run dev -- block append --parent-id doc-1 --data "Follow-up note" --json
```

내용을 점검하거나 정리해야 할 때 노트 데이터를 한꺼번에 조회합니다:

```bash
npm run dev -- sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

후속 워크플로를 위해 SQL 결과에서 간단한 보고서를 생성합니다:

```bash
npm run dev -- workflow sql-report --stmt "SELECT id FROM blocks LIMIT 5" --json
```

명령을 대화형으로 탐색하고 싶다면 REPL을 사용합니다:

```bash
printf '%s\n' 'exit' | npm run dev -- repl
```

## 요구 사항

- Node.js `>=22.10.0`
- 접근 가능한 SiYuan HTTP API 엔드포인트
- SiYuan API 토큰

## 설치

이 저장소는 현재 소스 우선 방식에 가깝습니다. 가장 안정적인 설치 방법은 저장소를 클론한 뒤 로컬에서 실행하는 것입니다.

### 1. Node.js 설치

Node.js가 이미 있는지 확인합니다:

```bash
node -v
npm -v
```

Node.js가 없다면 먼저 Node.js 22.10.0 이상을 설치하세요.

### 2. 저장소 클론

```bash
git clone <your-repo-url>
cd Siyuan-CLI
```

### 3. 의존성 설치

```bash
npm install
```

### 4. CLI 빌드

```bash
npm run build
```

그러면 `dist/` 에 컴파일된 파일이 생성됩니다.

### 5. 실행 방식 선택

환경 변수나 설정 파일로 `SIYUAN_TOKEN` 을 설정한 뒤, 처음 사용하는 사람에게 가장 쉬운 방법은 `npm run dev` 로 소스 엔트리포인트를 실행하는 것입니다:

```bash
npm run dev -- system version --json
```

빌드 후 로컬 `sy` 명령을 사용하고 싶다면:

```bash
npm link
sy system version --json
```

`npm link` 는 선택 사항입니다. 원한다면 계속 `npm run dev -- ...` 를 사용해도 됩니다.

## 에이전트 스킬

이 저장소에는 Codex 와 Claude Code 에서 사용할 수 있는 버전 관리형 `siyuan-cli` 스킬도 함께 들어 있습니다.

발견 위치:

- 공용 원본: `skills/siyuan-cli/`
- Codex 엔트리포인트: `.codex/skills/siyuan-cli/`
- Claude Code 엔트리포인트: `.claude/skills/siyuan-cli/`

설치:

- 별도 다운로드는 필요하지 않으며, 이 스킬은 이미 저장소 안에 있습니다
- 에이전트 실행 환경이 저장소 로컬 스킬을 자동으로 찾지 못한다면 이 디렉터리들을 스킬 검색 경로에 연결하거나 로컬 스킬 디렉터리로 복사하세요

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
npm run dev -- system version --json
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
npm run dev -- system version --json
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

## 현재 가능한 작업

최상위 명령:

- `system`
- `notebook`
- `doc`
- `block`
- `attr`
- `sql`
- `workflow`
- `repl`

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
npm run dev -- repl
```

`exit` 또는 `quit` 으로 종료합니다.

현재 REPL은 의도적으로 얇게 유지되어 있습니다. 일반 CLI 명령을 그대로 전달하고, 소량의 컨텍스트 기반 플래그 주입만 추가합니다.

내장 REPL 도우미:

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

현재 컨텍스트 주입 범위는 의도적으로 좁습니다:

- `workflow doc-upsert` 는 `--notebook` 과 `--path` 를 상속할 수 있습니다
- `doc create` 는 `--notebook` 을 상속할 수 있습니다
- `doc export-md`, `doc remove`, `doc rename` 은 `--id` 를 상속할 수 있습니다
- `doc resolve-path` 는 `--path` 를 상속할 수 있습니다
- `block get`, `block children`, `block update`, `block remove` 는 `--id` 를 상속할 수 있습니다
- `block append` 와 `block prepend` 는 `--parent-id` 를 상속할 수 있습니다

다른 명령은 그대로 전달되며 명시적인 플래그를 직접 지정해야 합니다.

`doc resolve-path` 는 다음 두 가지 경로 형식을 모두 허용합니다:

- `/Projects/Doc` 와 같은 저장된 SiYuan `hpath`
- `/Notebook/Projects/Doc` 와 같이 앞에 노트북 세그먼트가 붙은 동일한 경로

## 현재 제한 사항

- REPL 컨텍스트 주입은 위에 나열된 명령과 플래그 조합에만 적용되며, 범용 셸 계층이 아닙니다.
- 대상이 오프라인이거나 비정상 상태이면 구조화된 `API_*` 실패를 반환하지만, 명령은 여전히 0이 아닌 종료 코드를 반환합니다.

## 감사의 말

이 프로젝트는 SiYuan 저장소와 SiYuan API 문서를 참고하여 만들었습니다:

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

이 프로젝트는 MIT License를 따릅니다. 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.
