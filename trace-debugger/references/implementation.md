# 埋点实现参考

## 埋点规则

- 每个埋点独立，不创建共享函数（便于清理）
- 前端用 HTTP fetch，后端用文件写入
- 不要改用 console.log

---

## 前端埋点（HTTP）

**JavaScript / TypeScript / Vue / React 通用**：

```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
fetch('http://localhost:{{DEBUG_PORT}}/debug/log?session_id={{DEBUG_SESSION_ID}}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: '文件名:行号',
    message: '[位置:描述]',
    data: { /* 变量快照 */ }
  })
}).catch(() => {});
// #endregion DEBUG
```

---

## 后端埋点（文件写入）

**日志路径使用绝对路径**：`{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log`

### Node.js

**ES Modules**（`.mjs` 或 `package.json` 有 `"type": "module"`）：
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import('fs').then(fs => fs.appendFileSync('{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log',
  JSON.stringify({ location: '文件名:行号', message: '[位置:描述]', data: {}, timestamp: Date.now() }) + '\n'
)).catch(() => {});
// #endregion DEBUG
```

**CommonJS**（`.js` 或 `package.json` 无 `"type": "module"`）：
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
require('fs').appendFileSync('{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log',
  JSON.stringify({ location: `${__filename}:行号`, message: '[位置:描述]', data: {}, timestamp: Date.now() }) + '\n'
);
// #endregion DEBUG
```

### Python

```python
# #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import json, time
with open('{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log', 'a', encoding='utf-8') as f:
    f.write(json.dumps({'location': f'{__file__}:行号', 'message': '[位置:描述]', 'data': {}, 'timestamp': time.time()}) + '\n')
# #endregion DEBUG
```

### Go

```go
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
f, _ := os.OpenFile("{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
json.NewEncoder(f).Encode(map[string]interface{}{"location": "文件名.go:行号", "message": "[位置:描述]", "data": {}, "timestamp": time.Now().UnixMilli()})
f.Close()
// #endregion DEBUG
```

### Java

```java
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
try { java.nio.file.Files.writeString(java.nio.file.Paths.get("{{$(pwd)}}/.worker/debug/logs/{{DEBUG_SESSION_ID}}.log"),
  String.format("{\"location\":\"%s:%d\",\"message\":\"%s\",\"data\":{},\"timestamp\":%d}%n", "文件名.java", 10, "[位置:描述]", System.currentTimeMillis()),
  java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
} catch (Exception e) {}
// #endregion DEBUG
```

---

## 日志格式

```json
{
  "location": "文件名:行号",
  "message": "[位置:描述]",
  "data": { "变量": "值" },
  "timestamp": 1712345678901
}
```

---

## 清理埋点

**只清理当前会话的埋点**（根据 sessionId 精确匹配，不影响其他会话）：

```bash
# 删除指定 sessionId 的埋点
sed -i '/#region DEBUG \[sessionId: {{DEBUG_SESSION_ID}}/,/#endregion DEBUG/d' 文件名

# 删除后可能留下空行，可选清理
sed -i '/^$/d' 文件名
```

**注意**：不要用 `/#region DEBUG/,/#endregion DEBUG/d`，这会删除所有会话的埋点。

---

## 为什么不创建共享函数？

清理时可能遗漏共享函数，且污染代码库。每个埋点独立，删除 `#region DEBUG` 到 `#endregion DEBUG` 即可完全清理。