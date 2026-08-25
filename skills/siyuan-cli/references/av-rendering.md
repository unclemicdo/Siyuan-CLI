# AV (属性视图) 渲染与操作

## 问题背景

SiYuan 前端的 AV 表格渲染依赖于文档中有一个 **子块** 的类型为 `av`（DOM 中 `data-type="NodeAttributeView"`），仅靠给文档根节点设置 `custom-sy-av-view` 或 `data-av-id` 属性不会触发 AV 渲染。

## AV 文档创建核心步骤

以下是从头创建 AV 文档的标准步骤序列：

```python
# 1. 创建文档（产生一个空段落子块）
doc_id = gw.raw_post("/api/filetree/createDocWithMd", {
    "notebook": notebook_id, "path": f"/{av_name}", "markdown": "",
})["data"]

# 2. 创建 AV 视图元数据（列定义、选项等）
av_data = gw.render_attribute_view(doc_id, True)
gw.set_attribute_view_name(doc_id, av_name)
view_id = av_data.get("view", {}).get("id", "")

# 3. 给文档根节点设 custom-sy-av-view（项目自身用于查找 AV 的约定属性）
gw.raw_post("/api/attr/setBlockAttrs", {
    "id": doc_id, "attrs": {"custom-sy-av-view": view_id},
})

# 4. 删除 createDocWithMd 产生的空段落子块
for row in gw.raw_post("/api/query/sql", {
    "stmt": f"SELECT id FROM blocks WHERE parent_id = '{doc_id}' AND type = 'p'",
}).get("data", []):
    gw.raw_post("/api/block/deleteBlock", {"id": row["id"]})

# 5. 插入 AV 块（type=av）——关键步骤
#    data-av-id 必须设为文档 ID（doc_id），不是视图 ID（view_id）
#    且 data-av-id 必须出现在 prependBlock 的 DOM HTML 字符串中
dom_html = f'<div data-type="NodeAttributeView" data-av-id="{doc_id}"></div>'
result = gw.raw_post("/api/block/prependBlock", {
    "dataType": "dom", "data": dom_html, "parentID": doc_id,
})

# 6. 给新 AV 块的 IAL 也设上 data-av-id 确保持久化
av_block_id = (result.get("data") or [{}])[0].get("doOperations") or []
if av_block_id:
    gw.raw_post("/api/attr/setBlockAttrs", {
        "id": av_block_id[0]["id"],
        "attrs": {"data-av-id": doc_id},
    })

# 7. 添加 AV 列（字段）
for field in fields:
    gw.add_attribute_view_key(av_id=doc_id, key_id=..., key_name=field["name"],
                               key_type=field["type"], previous_key_id=...)
```

## sy CLI 等效命令

如果通过 `sy` CLI 而非 `av_gateway` 操作：

```bash
# 创建文档
sy doc create --notebook <id> --path /name

# 创建/刷新 AV 元数据
sy av render --id <doc_id> --create-if-not-exist --json

# 插入 AV 块（--data-type dom 才能传入 HTML 标签）
sy block prepend --parent-id <doc_id> --data-type dom <<'EOF'
<div data-type="NodeAttributeView" data-av-id="<doc_id>"></div>
EOF

# 设置块属性（--attrs 接受 JSON 对象）
sy attr set --id <block_id> --attrs '{"data-av-id":"<doc_id>"}'
```

## 核心原则

| 原则 | 说明 |
|------|------|
| `data-av-id` 用文档 ID | AV 块上的 `data-av-id` 必须指向**文档根节点 ID**（即 `createDocWithMd` 返回的 ID），不是 AV 视图 ID |
| data-av-id 必须在 DOM 中传入 | `prependBlock` 的 `data` 参数中必须包含 `data-av-id="..."`。在 DOM 字符串中缺失此属性会导致内核自动生成一个新空 AV 视图，且后续 `setBlockAttrs` 无法覆盖它 |
| `renderAttributeView` 用文档 ID 查询 | 该 API 传文档 ID 返回完整数据（列+行），传视图 ID 只返回视图配置（通常为空） |
| `custom-sy-av-view` 是项目约定属性 | 设在文档根节点上，供 `sy_client.py` 的 `get_av_id_from_block()` 查找使用，非思源标准属性 |
| `custom-avs` 是思源内部属性 | 用于标注某数据行（block）属于哪个 AV 文档。与渲染用的 `data-av-id` 无关 |

## AV 行操作

### 添加绑定行

绑定行会将现有文档块添加为 AV 的一行：

```bash
sy av add-blocks --av-id <id> --block-ids <id1,id2,id3>
```

### 删除行

通过行的 blockID 删除 AV 中的行：

```bash
sy av remove-blocks --av-id <id> --src-ids <row_id1,row_id2>
```

### 添加非绑定行

`--row-ids` 指定行的显式 item id(通过 API 的 `itemID` 字段下发),`--content` 可设置主键文本:

```bash
sy av add-detached-rows --av-id <id> --row-ids <row1> --content "第一行"
```

### 重命名 AV

### 重命名 AV

```bash
sy av set-name --av-id <id> --name "新名称"
```

### 常用查改命令

```bash
# 查看列定义
sy av keys --id <id> --json

# 查看视图配置
sy av views --id <id> --json

# 设置单元格值
sy av set-cell --av-id <id> --key-id <key> --item-id <row> --value "text" --json

# 添加列
sy av add-key --av-id <id> --key-id <new_key> --name "字段名" --type text --json

# 更新列
sy av update-key --av-id <id> --key-id <key> --name "新字段名" --json

# 删除列（需 --force）
sy av remove-key --av-id <id> --key-id <key> --force --json
```
