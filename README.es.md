# Siyuan CLI

[English](./README.md) | [简体中文](./README.zh-CN.md) | [繁體中文](./README.zh-TW.md) | [Español](./README.es.md) | [한국어](./README.ko.md)

CLI de TypeScript orientada a agentes para SiYuan Note.

Siyuan CLI ofrece una capa estable de línea de comandos sobre la API HTTP de SiYuan. Está pensada para quienes quieren automatizar operaciones sobre notas, ejecutar scripts repetibles o dar a los agentes de IA una forma más segura y predecible de trabajar con contenido de SiYuan.

## Por Qué Usar Siyuan CLI

Si principalmente escribes y editas notas a mano dentro de SiYuan, la interfaz gráfica suele ser la herramienta correcta. Siyuan CLI empieza a ser útil cuando una acción sobre notas deja de ser algo puntual y se convierte en un flujo repetible.

Para usuarios cotidianos de SiYuan, eso normalmente significa convertir rutinas como "crear la nota de hoy", "añadir seguimiento de una reunión" o "exportar este documento" en un comando fiable.

Para flujos de automatización y agentes, significa dar a scripts y herramientas locales de IA una forma estable de leer y escribir contenido de SiYuan sin tener que ensamblar solicitudes HTTP sin procesar a mano.

Lo que eso te aporta en la práctica:

- dedicar menos tiempo a tareas repetitivas de mantenimiento de notas y más al contenido en sí
- mantener coherentes flujos recurrentes como diarios, notas de reunión y actualizaciones de proyectos
- activar acciones sobre notas desde la terminal, scripts de shell, tareas cron, atajos o herramientas locales
- obtener salida JSON estable que encaja de forma natural en canalizaciones de automatización y agentes
- usar comandos más claros y valores por defecto más seguros que al llamar directamente a la API HTTP sin procesar de SiYuan

También conviene destacar las capacidades añadidas recientemente: Siyuan CLI ahora cubre flujos AV / base de datos, renderizado oficial de plantillas, staging seguro de archivos gestionados para artefactos de agentes, carga directa de recursos, búsquedas auxiliares de ruta / ID y exportación de recursos vinculados a documentos. La intención es que agentes y scripts puedan cubrir más flujos reales de SiYuan mediante comandos de producto estables, en lugar de volver a escrituras SQL sin procesar o a acceso improvisado al sistema de archivos; estas capacidades nuevas también dejan más explícitos y acotados los límites de escritura para automatización.

## Casos de Uso Comunes

La gente suele recurrir a Siyuan CLI en momentos como estos:

- Al empezar el día, crear un diario con fecha, un registro de trabajo o una nota de standup a partir de una plantilla lista para usar.
- Justo después de una llamada, añadir el resumen y las acciones pendientes al documento de proyecto correcto antes de perder el contexto.
- Cuando un documento necesita salir de SiYuan, exportarlo como Markdown para compartirlo, respaldarlo, publicarlo o enviarlo a otra herramienta.
- Cuando un script o agente necesita contexto fiable, resolver una ruta legible una vez y reutilizar el ID real del documento en comandos posteriores.
- Cuando necesitas limpiar o analizar muchas notas a la vez, actualizar bloques por lotes o ejecutar consultas SQL en lugar de editar una nota cada vez.
- Cuando SiYuan forma parte de un flujo local, permitir que automatizaciones o agentes lean notas, escriban actualizaciones y generen informes de forma predecible.

## Ejemplos Rápidos

Los ejemplos siguientes asumen que ya configuraste tu token mediante variables de entorno exportadas o un archivo de configuración. Evita poner el token en línea dentro del comando.

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

Lista los cuadernos disponibles:

```bash
sy notebook list --json
```

Crea un nuevo documento — contenido vía stdin heredoc (sin escapes de shell, sin límite ARG_MAX):

```bash
sy doc create --notebook nb-1 --path /Projects/MyDoc --json <<'EOF'
# Nuevo Documento

Contenido con `code`, $HOME, "comillas" — todo seguro.
EOF
```

Si el contenido ya está en un archivo, usa `--markdown-file`.

Añade contenido a un documento existente:

```bash
sy block append --parent-id doc-1 --json <<'EOF'
## Seguimiento

- [ ] Tarea 1
- [ ] Tarea 2
EOF
```

Establece etiquetas en un documento:

```bash
sy tag set-doc --id doc-1 --tags "AI Agent,PDCA" --json
```

Consulta tus notas con SQL:

```bash
sy sql query --stmt "SELECT id FROM blocks LIMIT 1" --json
```

Explora comandos interactivamente con el REPL:

```bash
sy repl
```

## Requisitos

- Node.js `>=22.10.0`
- Un endpoint HTTP API de SiYuan accesible
- Un token de API de SiYuan

### Compatibilidad de versiones de SiYuan

La CLI está orientada a la API estable de SiYuan y funciona con SiYuan 3.6.5 y posteriores, incluida 3.8.1. Dos comportamientos de AV cambiaron en 3.8.1 y ya están manejados por la CLI:

- `av set-cell` envía `itemID` (la bandera `--item-id`); SiYuan 3.8.1 rechaza el campo de solicitud heredado `rowID`.
- `av update-key` actualiza campos a través de `/api/transactions` (`updateAttrViewCol` / `setAttrViewColIcon`) en lugar de la ruta nunca registrada `/api/av/updateAttributeViewKey`.

Correcciones de la CLI para el contrato de API de 3.8.1: `doc create` siempre envía un campo `markdown` explícito (si falta la clave, SiYuan 3.8.1 devuelve `data: null` sin crear el documento), y `av add-detached-rows` envía `itemID` (los valores de `--row-ids`) más un texto de clave principal opcional `--content` según el contrato oficial de `addAttributeViewBlocks`.

## Instalación

```bash
npm install -g @unclemicdo/siyuan-cli
```

Luego ejecuta:

```bash
sy system version --json
```

Para desarrollo local, clona el repositorio y usa `npm run dev`.

El comando `sy` requiere Node.js `>=22.10.0` y un token/base URL de SiYuan ya configurados.

## Skill para agentes

Este repositorio también incluye un skill versionado llamado `siyuan-cli` para Codex y Claude Code.

Directorio fuente canónico:

- `skills/siyuan-cli/`

Instalación global:

- trata `skills/siyuan-cli/` como la única fuente de verdad
- durante el desarrollo local, instala el skill global preferentemente como un enlace simbólico a este directorio
- elige explícitamente una raíz de skills como `~/.codex/skills` o `~/.claude/skills`
- si no quieres usar enlaces simbólicos en una máquina, también puedes usar el modo de copia

Instala o refresca el skill global:

```bash
npm run skill:install -- --target-dir ~/.codex/skills --force
```

Variantes útiles:

```bash
npm run skill:install -- --mode copy --target-dir ~/.codex/skills --force
npm run skill:install -- --target-dir ~/.claude/skills --force
```

Uso:

- pide explícitamente al agente que use el skill `siyuan-cli` cuando quiera trabajar a través de esta CLI
- úsalo cuando el agente necesite elegir comandos, preferir `--json`, resolver rutas a ids o recuperarse de errores `CONFIG_*`, `API_*` o `SQL_*`

## Configuración Inicial

Necesitas dos datos antes de que la CLI pueda comunicarse con SiYuan:

- un token de API de SiYuan
- la URL base de la API de SiYuan

Si tu instancia de SiYuan se ejecuta en la dirección local predeterminada, la URL base suele ser:

```text
http://127.0.0.1:6806
```

En ese caso, solo necesitas proporcionar un token.

### Opción A: usar variables de entorno

Esta es la forma más rápida de empezar:

```bash
export SIYUAN_TOKEN=your-token
export SIYUAN_BASE_URL=http://127.0.0.1:6806
```

Luego ejecuta:

```bash
sy system version --json
```

### Opción B: usar un archivo de configuración

Esto suele ser mejor si usas la CLI con frecuencia.

Ruta predeterminada del archivo de configuración:

```text
~/.config/siyuan-cli/config.json
```

Ejemplo:

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

Luego ejecuta:

```bash
sy system version --json
```

### Reglas de Configuración

Variables de entorno opcionales:

- `SIYUAN_BASE_URL`
- `SIYUAN_TOKEN`
- `SIYUAN_TIMEOUT`
- `SIYUAN_PROFILE`

Flags globales:

- `--base-url`
- `--timeout`
- `--profile`

Valores predeterminados:

- `SIYUAN_BASE_URL=http://127.0.0.1:6806`
- `SIYUAN_TIMEOUT=15000`

Prioridad de configuración:

1. flags explícitos de CLI para `baseUrl`, `timeout` y `profile`
2. variables de entorno
3. archivo de configuración
4. valores predeterminados integrados

Prioridad de resolución del token:

1. `SIYUAN_TOKEN`
2. token del perfil en el archivo de configuración

Los valores vacíos en variables de entorno se tratan como no definidos y se reemplazan por la siguiente fuente.

## Comandos Disponibles

Subcomandos implementados hoy:

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

## Modo JSON

Todos los comandos implementados admiten `--json`.

Formato de éxito:

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

Formato de error:

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

Inicia la shell interactiva:

```bash
sy repl
```

Sal con `exit` o `quit`.

El REPL reenvía los comandos normales de la CLI y admite herencia de contexto para flags comunes de doc y block (`--notebook`, `--path`, `--id`, `--parent-id`), evitando repetirlos en comandos consecutivos.

Ayudas integradas del REPL:

- `profile <name>`
- `use notebook <id-or-name>`
- `use doc <id-or-path>`
- `context`

`doc resolve-path` acepta cualquiera de estos formatos de ruta:

- el `hpath` almacenado en SiYuan, como `/Projects/Doc`
- la misma ruta con un segmento inicial de cuaderno, como `/Notebook/Projects/Doc`

## Limitaciones Actuales

- La inyección de contexto del REPL solo cubre flags comunes de doc y block; no es una capa de shell de propósito general.
- Los objetivos desconectados o con errores devuelven fallos estructurados `API_*`, pero el comando sigue saliendo con un código distinto de cero.

## Agradecimientos

Este proyecto se elaboró tomando como referencia el repositorio de SiYuan y la documentación de su API:

- SiYuan repo: https://github.com/siyuan-note/siyuan
- SiYuan API docs: https://github.com/siyuan-note/siyuan/blob/master/API.md

## License

Este proyecto está licenciado bajo la MIT License. Consulta [LICENSE](./LICENSE).
