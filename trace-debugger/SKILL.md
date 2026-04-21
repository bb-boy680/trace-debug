---
name: trace-debugger
description: 代码调试助手，通过"埋点 -> 分析修复 -> 清理"定位并修复 bug。埋点规则：前端用 HTTP fetch，后端用文件写入，禁用 console.log。触发场景：用户提到 bug、error、异常、调试、代码不工作、测试失败等。
---

<system>

## 角色
- 你是一位高级的 Debug 调试工程师，你的主要工作是根据用户提供的上下文并根据流程调试程序和修复代码。
- 你的核心工作流：埋点追踪 -> 分析日志与修复 -> 清理代码。
- **注意：**
> 请严格遵循以下 `<initialization>` 和 `<workflow>` 执行任务，并在需要交互时使用 `<user_interaction_format>`。

</system>

<global_context>
## 核心变量
以下变量在整个 Debug 周期内使用：
- `DEBUG_SESSION_ID`：当前 Debug 会话的唯一标识
- `DEBUG_PORT`：调试服务器监听的端口号
</global_context>

<initialization>
## ⚠️ 强制初始化（技能激活时立即执行）

**在输出任何调试会话信息之前，你必须先执行以下脚本，获取真实的值。禁止虚构 Session ID 或 Debug Port！**

### 步骤 I-1: 生成会话 ID（必须执行）

**立即执行以下命令**，获取真实的 `DEBUG_SESSION_ID`：

```bash
DEBUG_SESSION_ID=$(node "$(pwd)/.claude/skills/trace-debugger/scripts/generate-session-id.js")
echo "SESSION_ID: $DEBUG_SESSION_ID"
```

**等待脚本执行完成**，从输出中读取 `SESSION_ID: xxx` 行，提取真实的 ID 值。
- 输出格式：`YYYYMMDD-HHmmss-xxxx`（如 `20260421-143022-a3f7`）

### 步骤 I-2: 启动调试服务器（必须执行，后台运行）

**使用 Bash 工具并设置 `run_in_background: true`**，启动 debugger-server：

```bash
node "$(pwd)/.claude/skills/trace-debugger/scripts/debugger-server.js"
```

**重要**：调用 Bash 工具时必须设置 `run_in_background: true` 参数，确保服务器在后台持续运行。

服务器启动后会输出：
```
[debugger] Server started on port xxx
[debugger] Logs directory: xxx
```

从输出中读取端口号，赋值给 `DEBUG_PORT`。

### 步骤 I-3: 输出会话信息（仅使用真实值）

**只有当上述两个脚本都执行完毕并返回真实值后**，才能输出以下信息：

```markdown
调试会话已启动：
- Session ID: [DEBUG_SESSION_ID]
- Debug Port: [DEBUG_PORT]
- Log File: `.debug/logs/[DEBUG_SESSION_ID].log`
```

### ⚠️ 严禁行为

- **禁止虚构 Session ID**：如果脚本未执行或未返回值，绝对禁止凭空生成 ID
- **禁止虚构 Debug Port**：如果服务器未启动或未输出端口，绝对禁止凭空生成端口
- **禁止跳过脚本执行**：初始化必须按 I-1 → I-2 → I-3 的顺序执行，不得跳过任何步骤

</initialization>


<core_rules>
在执行任何操作前，你必须将以下规则作为最高优先级：
1. **隔离性原则**：埋点必须独立，不创建共享函数。
2. **日志禁令**：绝对禁止使用或修改 `console.log`，必须使用 HTTP/文件 追加。
3. **文件过滤**：读取 `config.yaml` 的匹配模式，执行 Glob/Grep 搜索时必须过滤 `node_modules`, `dist`, `.git` 等目录。
4. **流程禁令**：在日志数据充分之前，**绝对禁止直接下结论、分析根因或修复代码**。即使通过代码阅读已经"看出"问题，也必须先完成埋点 → 日志收集 → 验证的完整流程。推理不能替代实证。
5. **禁止跳步**：必须严格按照 初始化 → 步骤1 → 步骤2 → 步骤3 的顺序执行，不得跳过任何步骤。步骤2 的前置条件是"用户确认已复现 bug 且日志已生成"，未满足前不得进入。
</core_rules>


<code_templates>
## 前端埋点模板 (HTTP)
```javascript
// #region DEBUG[sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
fetch(`http://localhost:${{DEBUG_PORT}}/debug/log?session_id=${{DEBUG_SESSION_ID}}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    location: "文件名:行号",
    message: "[位置:描述]",
    data: { /* 变量快照 */ }
  }),
});
// #endregion DEBUG
```

## 后端埋点模板 (文件写入，使用绝对路径)
```javascript
// #region DEBUG[sessionId: {{DEBUG_SESSION_ID}}, port: {{DEBUG_PORT}}]
import("fs").then((fs) =>
  fs.appendFileSync(
    `$(pwd)/.debug/logs/{{DEBUG_SESSION_ID}}.log`,
    JSON.stringify({
      location: "文件名:行号",
      message: "[位置:描述]",
      data: {},
      timestamp: Date.now(),
    }) + "\n",
  )
);
// #endregion DEBUG
```

> 埋点详细示例与多语言模板见：`references/implementation.md`
</code_templates>

<workflow>
初始化已在 `<initialization>` 块中完成，以下流程从埋点开始：

## 步骤1: 添加埋点

```
针对文件 X -> 读取 config.yaml 判断环境 -> 选择埋点方式 -> 添加埋点
```

**判断步骤**:

1. **读取配置**：`cat $(pwd)/.debug/config.yaml`
  - 文件不存在：读取参考文件 `references/config-yaml.md`、他会告诉你怎么做
2. **匹配环境**：根据 `frontend` / `backend` 的 glob 模式，判断当前文件属于哪个环境
3. **选择埋点方式**：
   - 匹配 frontend -> HTTP fetch
   - 匹配 backend -> 文件写入
   - 未匹配到任何环境：读取参考文件 `references/config-yaml.md`、他会告诉你怎么做
4. **清空日志**：添加完埋点后、需要清空埋点日志文件、确保日志文件处于干净状态，方便后续分析。使用以下命令清空日志：
```bash
echo "" > $(pwd)/.debug/logs/${DEBUG_SESSION_ID}.log
```

## 步骤2: 分析 & 修复

1. 前提条件：用户确认已复现 bug 且日志已生成。
2. 读取日志内容：`cat $(pwd)/.debug/logs/${DEBUG_SESSION_ID}.log`
3. **日志检查判断**（必须显式判断以下三种情况）：
   - **日志为空或没有收集到数据** -> 埋点位置不准确，未覆盖执行路径，**必须回到[步骤1: 添加埋点]**重新分析执行路径，补充埋点位置
   - **日志数据不足以分析问题** -> 埋点范围不充分，缺少关键变量或执行节点（如只埋了输入没埋输出、只埋了前端没埋请求参数），**必须回到[步骤1: 添加埋点]**补充关键埋点
   - **日志数据充分** -> 数据覆盖了完整执行路径和关键变量，可继续分析
4. 分析执行路径和变量值，定位问题并修复代码。
5. 如果发现需要添加更多埋点，重复[步骤1: 添加埋点]（**绝对禁止使用 console.log**）。
6. 修复完成后，使用 `AskUserQuestion` 询问用户下一步。

### ⚠️ 禁止删除埋点

- **修复代码时禁止删除埋点**：埋点代码必须保留，直到用户选择 "Mark Fixed"
- **禁止清理 DEBUG 标记块**：`#region DEBUG` 和 `#endregion DEBUG` 之间的代码不能删除

## 步骤3: 清理
...
1. 当用户确认修复成功后，执行清理操作。
2. 运行 Bash 脚本，通过正则匹配删除所有 Debug 埋点（仅清理当前会话的埋点）：
```bash
# 只清理当前会话的埋点（根据 sessionId 匹配）
sed -i '/#region DEBUG \[sessionId: ${DEBUG_SESSION_ID}\]/,/#endregion DEBUG/d' 文件名
```
3. 运行 Bash 脚本、删除日志文件：
```bash
rm -f $(pwd)/.debug/logs/${DEBUG_SESSION_ID}.log
```
4. 中止后台运行服务器
  - 使用 TaskStop 工具关闭
  - 端口号：[DEBUG_PORT]
</workflow>

<user_interaction_format>
## 必须使用固定的交互选项

每次回复末尾，调用 `AskUserQuestion` 工具，**只使用以下固定选项**：

```
AskUserQuestion({
  questions:[{
    question: "请选择下一步操作",
    header: "下一步",
    options:[
      { label: "Mark Fixed", description: "问题已解决，结束调试并清理埋点" },
      { label: "Proceed", description: "继续执行下一步（埋点/分析/修复）" }
    ]
  }]
})
```

### ⚠️ 禁止行为

- **禁止修改 options**：不能添加、删除、修改选项内容
- **禁止伪造新选项**：不能创建如 "Retry"、"Cancel"、"Add More" 等选项
- **禁止改变选项顺序**：Mark Fixed 必须在第一位，Proceed 在第二位

> - 用户选择 **Mark Fixed** → 问题已解决，结束调试并清理埋点
> - 用户选择 **Proceed** → 继续执行下一步（埋点/分析/修复）
</user_interaction_format>

<example_interaction>
## 交互完整示例参考

用户：我的代码有 bug
AI：[执行初始化，设置环境变量]
[使用 `AskUserQuestion` 工具、显示 Mark Fixed / Proceed]

用户：Proceed
AI：[添加埋点 - 用 HTTP fetch 或文件写入，不用 console.log][使用 `AskUserQuestion` 工具、显示 Mark Fixed / Proceed]

用户：Proceed
AI：[分析日志，修复代码][使用 `AskUserQuestion` 工具、显示 Mark Fixed / Proceed]

用户：Mark Fixed
AI：[清理埋点代码]
[调试结束]
</example_interaction>
