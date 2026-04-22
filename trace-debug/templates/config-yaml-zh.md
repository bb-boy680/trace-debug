# config.yaml 机制

<system>
## 文件职责

本文档定义环境判断机制，负责：
1. config.yaml 文件格式与位置
2. 前端/后端环境判断流程
3. 渐进式写入 config.yaml 的规则

**核心目标**：确保 AI 正确判断文件运行环境，并将判断结果缓存到 config.yaml 供后续使用。
</system>

<context>
## 核心概念

**运行环境分类**：
- `frontend`：浏览器环境，使用 HTTP fetch 埋点
- `backend`：Node.js 环境，使用文件写入埋点

**关键认知**：
> **文件后缀 ≠ 运行环境**
> 
> `.tsx` 文件可能运行在浏览器（React DOM）或 Node.js（Ink、Electron、Next.js SSR）
> 
> 必须分析文件的实际运行位置，而非依赖后缀名判断

**config.yaml 作用**：
- 缓存已分析过的路径模式，避免重复分析
- 渐进式补充，随调试推进逐步完善
</context>

<rules>
## 必须遵守的规则

<rule id="R1">
**渐进式写入**
- 每分析完一个文件 → 立即追加路径模式到 config.yaml
- 禁止批量写入：不能一次预设所有模式
- 禁止跳过写入：分析后必须更新配置
</rule>

<rule id="R2">
**依据必须真实**
- 判断依据必须来自实际读取的内容（package.json、文件导入等）
- 禁止凭直觉或经验猜测
- 禁止套用规则表格
</rule>

<rule id="R3">
**路径模式规范**
- 使用 glob 模式：`cli/**/*` 匹配 cli 下所有文件
- 不要写具体文件名：写目录模式便于后续匹配
- 添加注释说明判断原因
</rule>

<rule id="R4">
**禁止仅凭后缀判断**
- ❌ `"**/*.tsx"` → frontend（错误！）
- ❌ `"**/*.vue"` → frontend（错误！）
- ✅ `"web/**/*"` → frontend（正确，基于目录分析）
</rule>
</rules>

<flow>
## 判断流程

<step id="S1" name="读取配置">
```bash
cat $(pwd)/.debug/config.yaml
```
- 文件存在 → 执行 S2
- 文件不存在 → 跳到 S3
</step>

<step id="S2" name="匹配缓存">
检查目标文件路径是否匹配 config.yaml 中的 glob 模式：

| 匹配结果 | 埋点方式 | 下一步 |
|---------|---------|-------|
| 匹配 frontend | HTTP fetch | 结束 |
| 匹配 backend | 文件写入 | 结束 |
| 都不匹配 | - | 执行 S3 |
</step>

<step id="S3" name="探索分析">
**必须主动探索项目，分析文件实际运行位置**

1. 读取 `package.json` → 了解项目类型、依赖
2. 查看目录结构 → 判断架构（monorepo/CLI/Web）
3. 读取目标文件 → 分析导入内容、调用关系
4. 判断运行位置 → 浏览器 or Node.js
5. 说明判断依据 → 必须引用实际内容
</step>

<step id="S4" name="写入配置">
**分析完成后，立即追加路径模式**

1. 确定该文件属于 frontend 或 backend
2. 提取路径模式（使用 glob）
3. 追加到 config.yaml
4. 添加注释说明原因
</step>
</flow>

<example>
## 正确示例

### 示例 A：分析 CLI 终端 UI 文件

**文件**: `cli/src/App.tsx`

**探索过程**:
```
1. package.json → 发现依赖 ink
2. 文件内容 → import { render, Box } from "ink"
3. 判断 → Ink 是终端 React 渲染器，运行在 Node.js
4. 结论 → backend，文件写入埋点
```

**写入 config.yaml**:
```yaml
backend:
  - "cli/**/*"  # Ink 终端 UI，Node.js 环境
```

### 示例 B：分析 Web 前端文件

**文件**: `web/src/pages/Home.tsx`

**探索过程**:
```
1. package.json → 发现 vite、react-dom
2. 文件内容 → import { createRoot } from "react-dom/client"
3. 判断 → react-dom/client 用于浏览器渲染
4. 结论 → frontend，HTTP fetch 埋点
```

**写入 config.yaml**:
```yaml
frontend:
  - "web/**/*"  # Web 前端，浏览器环境
```

### 示例 C：分析 Monorepo 包文件

**文件**: `packages/orchestrator/src/index.ts`

**探索过程**:
```
1. package.json → monorepo 结构，无前端依赖
2. 目录结构 → packages 目录下都是 Node.js 包
3. 文件内容 → 无 react-dom、ink 等前端库导入
4. 判断 → Node.js 包，运行在后端
5. 结论 → backend，文件写入埋点
```

**追加 config.yaml**:
```yaml
backend:
  - "cli/**/*"  # Ink 终端 UI
  - "packages/**/*"  # Monorepo 包，Node.js 环境
```
</example>

<config-example>
## config.yaml 文件示例

**初始状态**（不存在或为空）

**渐进补充后的完整示例**:
```yaml
# 前端项目目录匹配模式（支持 glob）
frontend:
  - "web/**/*"          # Web 前端，浏览器环境
  - "**/client/**"      # 客户端代码
  - "**/ui/**/*.tsx"    # UI 组件（需验证有 react-dom）

# 后端项目目录匹配模式（支持 glob）
backend:
  - "cli/**/*"          # Ink 终端 UI，Node.js 环境
  - "packages/**/*"     # Monorepo 包，Node.js 环境
  - "**/server/**"      # 服务端代码
  - "**/api/**"         # API 代码
```

**模板文件**: `assets/config.yaml`
</config-example>

<error-map>
## 错误流程对照

<error id="E1" severity="critical">
**错误**: 仅凭文件后缀判断环境

```
❌ 错误流程：
看到 .tsx 文件 → 直接判断 frontend → HTTP fetch 埋点

✅ 正确流程：
看到 .tsx 文件 → 读取 package.json → 读取文件内容 → 
分析导入（ink? react-dom?）→ 判断实际运行位置 → 选择埋点方式
```

**后果**: Ink/Electron 项目使用 HTTP fetch 会报错，无法收集日志
</error>

<error id="E2" severity="critical">
**错误**: 批量预设 config.yaml

```
❌ 错误流程：
开始调试 → 一次性写入所有可能的路径模式 → 
后续文件直接匹配，不再分析

✅ 正确流程：
分析一个文件 → 写入一个模式 → 
分析下一个文件 → 追加新的模式 → 渐进完善
```

**后果**: 预设模式可能错误，导致后续判断全部出错
</error>

<error id="E3" severity="medium">
**错误**: 跳过写入 config.yaml

```
❌ 错误流程：
分析文件 → 判断环境 → 添加埋点 → 
（跳过写入）→ 下次遇到同类型文件 → 重新分析

✅ 正确流程：
分析文件 → 判断环境 → 写入 config.yaml → 添加埋点 → 
下次遇到同类型文件 → 直接匹配，无需分析
```

**后果**: 重复分析降低效率，浪费 token
</error>

<error id="E4" severity="medium">
**错误**: 凭直觉猜测，无依据

```
❌ 错误流程：
看到 cli 目录 → 凭直觉判断是后端 → 文件写入埋点

✅ 正确流程：
看到 cli 目录 → 读取 package.json → 确认 ink 依赖 → 
读取文件 → 确认 import from "ink" → 判断后端 → 说明依据
```

**后果**: 直觉可能错误，无法验证判断正确性
</error>
</error-map>