# Instrumentation Implementation Reference

## Instrumentation Rules

- Each instrumentation point is independent, do not create shared functions (easier to cleanup)
- Frontend uses HTTP fetch, backend uses file write
- Do NOT replace with console.log

---

## Frontend Instrumentation (HTTP)

**JavaScript / TypeScript / Vue / React Universal**:

```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
fetch('http://localhost:{{DEBUG_PORT}}/debug/log?session_id={{DEBUG_SESSION_ID}}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'filename:line_number',
    message: '[location:description]',
    data: { /* variable snapshot */ }
  })
});
// #endregion DEBUG
```

---

## Backend Instrumentation (File Write)

**Log path uses absolute path**: `{{$(pwd)}}/.debug/logs/{{DEBUG_SESSION_ID}}.log`

### Node.js

**ES Modules** (`.mjs` or `package.json` has `"type": "module"`):
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import("fs").then((fs) =>
  fs.appendFileSync(
    `$(pwd)/.debug/logs/{{DEBUG_SESSION_ID}}.log`,
    JSON.stringify({
      location: "filename:line_number",
      message: "[location:description]",
      data: {},
      timestamp: Date.now(),
    }) + "\n",
  )
);
// #endregion DEBUG
```

**CommonJS** (`.js` or `package.json` without `"type": "module"`):
```javascript
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
require('fs').appendFileSync('{{$(pwd)}}/.debug/logs/{{DEBUG_SESSION_ID}}.log',
  JSON.stringify({ location: `${__filename}:line_number`, message: '[location:description]', data: {}, timestamp: Date.now() }) + '\n'
);
// #endregion DEBUG
```

### Python

```python
# #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import json, time
with open('{{$(pwd)}}/.debug/logs/{{DEBUG_SESSION_ID}}.log', 'a', encoding='utf-8') as f:
    f.write(json.dumps({'location': f'{__file__}:line_number', 'message': '[location:description]', 'data': {}, 'timestamp': time.time()}) + '\n')
# #endregion DEBUG
```

### Go

```go
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
f, _ := os.OpenFile("{{$(pwd)}}/.debug/logs/{{DEBUG_SESSION_ID}}.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
json.NewEncoder(f).Encode(map[string]interface{}{"location": "filename.go:line_number", "message": "[location:description]", "data": {}, "timestamp": time.Now().UnixMilli()})
f.Close()
// #endregion DEBUG
```

### Java

```java
// #region DEBUG [sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
try { java.nio.file.Files.writeString(java.nio.file.Paths.get("{{$(pwd)}}/.debug/logs/{{DEBUG_SESSION_ID}}.log"),
  String.format("{\"location\":\"%s:%d\",\"message\":\"%s\",\"data\":{},\"timestamp\":%d}%n", "filename.java", 10, "[location:description]", System.currentTimeMillis()),
  java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
} catch (Exception e) {}
// #endregion DEBUG
```

---

## Log Format

```json
{
  "location": "filename:line_number",
  "message": "[location:description]",
  "data": { "variable": "value" },
  "timestamp": 1712345678901
}
```

---

## Cleanup Instrumentation

**Only cleanup instrumentation from current session** (exact match by sessionId, does not affect other sessions):

```bash
# Delete instrumentation with specified sessionId
sed -i '/#region DEBUG \[sessionId: {{DEBUG_SESSION_ID}}/,/#endregion DEBUG/d' filename

# May leave empty lines after deletion, optional cleanup
sed -i '/^$/d' filename
```

**Note**: Do NOT use `/#region DEBUG/,/#endregion DEBUG/d`, this would delete instrumentation from all sessions.

---

## Why Not Create Shared Functions?

Shared functions may be missed during cleanup and pollute the codebase. Each instrumentation point is independent, simply delete `#region DEBUG` to `#endregion DEBUG` for complete cleanup.