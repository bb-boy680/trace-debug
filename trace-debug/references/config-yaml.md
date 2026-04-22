# config.yaml Mechanism

<system>
## File Responsibility

This document defines the environment judgment mechanism, responsible for:
1. config.yaml file format and location
2. Frontend/backend environment judgment process
3. Progressive writing rules for config.yaml

**Core Objective**: Ensure AI correctly judges file runtime environment and caches the judgment result in config.yaml for subsequent use.
</system>

<context>
## Core Concepts

**Runtime Environment Classification**:
- `frontend`: Browser environment, uses HTTP fetch instrumentation
- `backend`: Node.js environment, uses file write instrumentation

**Key Understanding**:
> **File Extension ≠ Runtime Environment**
> 
> `.tsx` files may run in browser (React DOM) or Node.js (Ink, Electron, Next.js SSR)
> 
> Must analyze the file's actual runtime location, not rely on extension name to judge

**config.yaml Purpose**:
- Cache analyzed path patterns to avoid repeated analysis
- Progressive supplementation, gradually improved as debugging progresses
</context>

<rules>
## Must-Follow Rules

<rule id="R1">
**Progressive Writing**
- After analyzing each file → immediately append path pattern to config.yaml
- Prohibited batch writing: Cannot preset all patterns at once
- Prohibited skipping writing: Must update configuration after analysis
</rule>

<rule id="R2">
**Evidence Must Be Real**
- Judgment evidence must come from actually read content (package.json, file imports, etc.)
- Prohibited guessing based on intuition or experience
- Prohibited applying rule tables
</rule>

<rule id="R3">
**Path Pattern Specification**
- Use glob patterns: `cli/**/*` matches all files under cli
- Do NOT write specific filenames: Write directory patterns for easier subsequent matching
- Add comments explaining judgment reason
</rule>

<rule id="R4">
**Prohibited Judging by Extension Only**
- ❌ `"**/*.tsx"` → frontend (Wrong!)
- ❌ `"**/*.vue"` → frontend (Wrong!)
- ✅ `"web/**/*"` → frontend (Correct, based on directory analysis)
</rule>
</rules>

<flow>
## Judgment Process

<step id="S1" name="Read Configuration">
```bash
cat $(pwd)/.debug/config.yaml
```
- File exists → Execute S2
- File doesn't exist → Jump to S3
</step>

<step id="S2" name="Match Cache">
Check if target file path matches glob patterns in config.yaml:

| Match Result | Instrumentation Method | Next Step |
|---------|---------|-------|
| Matches frontend | HTTP fetch | End |
| Matches backend | File write | End |
| Neither matches | - | Execute S3 |
</step>

<step id="S3" name="Explore Analysis">
**Must actively explore project, analyze file's actual runtime location**

1. Read `package.json` → Understand project type, dependencies
2. View directory structure → Judge architecture (monorepo/CLI/Web)
3. Read target file → Analyze imports, call relationships
4. Judge runtime location → Browser or Node.js
5. Explain judgment evidence → Must cite actual content
</step>

<step id="S4" name="Write Configuration">
**After analysis complete, immediately append path pattern**

1. Determine file belongs to frontend or backend
2. Extract path pattern (use glob)
3. Append to config.yaml
4. Add comment explaining reason
</step>
</flow>

<example>
## Correct Examples

### Example A: Analyzing CLI Terminal UI File

**File**: `cli/src/App.tsx`

**Exploration Process**:
```
1. package.json → Found ink dependency
2. File content → import { render, Box } from "ink"
3. Judgment → Ink is terminal React renderer, runs in Node.js
4. Conclusion → backend, file write instrumentation
```

**Write to config.yaml**:
```yaml
backend:
  - "cli/**/*"  # Ink terminal UI, Node.js environment
```

### Example B: Analyzing Web Frontend File

**File**: `web/src/pages/Home.tsx`

**Exploration Process**:
```
1. package.json → Found vite, react-dom
2. File content → import { createRoot } from "react-dom/client"
3. Judgment → react-dom/client used for browser rendering
4. Conclusion → frontend, HTTP fetch instrumentation
```

**Write to config.yaml**:
```yaml
frontend:
  - "web/**/*"  # Web frontend, browser environment
```

### Example C: Analyzing Monorepo Package File

**File**: `packages/orchestrator/src/index.ts`

**Exploration Process**:
```
1. package.json → monorepo structure, no frontend dependencies
2. Directory structure → packages directory contains Node.js packages
3. File content → No frontend library imports like react-dom, ink
4. Judgment → Node.js package, runs in backend
5. Conclusion → backend, file write instrumentation
```

**Append to config.yaml**:
```yaml
backend:
  - "cli/**/*"  # Ink terminal UI
  - "packages/**/*"  # Monorepo packages, Node.js environment
```
</example>

<config-example>
## config.yaml File Example

**Initial State** (doesn't exist or is empty)

**Complete example after progressive supplementation**:
```yaml
# Frontend project directory matching patterns (support glob)
frontend:
  - "web/**/*"          # Web frontend, browser environment
  - "**/client/**"      # Client code
  - "**/ui/**/*.tsx"    # UI components (needs verification with react-dom)

# Backend project directory matching patterns (support glob)
backend:
  - "cli/**/*"          # Ink terminal UI, Node.js environment
  - "packages/**/*"     # Monorepo packages, Node.js environment
  - "**/server/**"      # Server code
  - "**/api/**"         # API code
```

**Template File**: `assets/config.yaml`
</config-example>

<error-map>
## Error Process Comparison

<error id="E1" severity="critical">
**Error**: Judge environment solely by file extension

```
❌ Wrong Process:
See .tsx file → Directly judge frontend → HTTP fetch instrumentation

✅ Correct Process:
See .tsx file → Read package.json → Read file content → 
Analyze imports (ink? react-dom?) → Judge actual runtime location → Choose instrumentation method
```

**Consequence**: Ink/Electron projects using HTTP fetch will error, cannot collect logs
</error>

<error id="E2" severity="critical">
**Error**: Batch preset config.yaml

```
❌ Wrong Process:
Start debugging → Write all possible path patterns at once → 
Subsequent files directly match, no more analysis

✅ Correct Process:
Analyze one file → Write one pattern → 
Analyze next file → Append new pattern → Progressive improvement
```

**Consequence**: Preset patterns may be wrong, causing all subsequent judgments to error
</error>

<error id="E3" severity="medium">
**Error**: Skip writing config.yaml

```
❌ Wrong Process:
Analyze file → Judge environment → Add instrumentation → 
(Skip writing) → Encounter same type file next time → Re-analyze

✅ Correct Process:
Analyze file → Judge environment → Write config.yaml → Add instrumentation → 
Encounter same type file next time → Direct match, no analysis needed
```

**Consequence**: Repeated analysis reduces efficiency, wastes tokens
</error>

<error id="E4" severity="medium">
**Error**: Guess by intuition, no evidence

```
❌ Wrong Process:
See cli directory → Intuitively judge as backend → File write instrumentation

✅ Correct Process:
See cli directory → Read package.json → Confirm ink dependency → 
Read file → Confirm import from "ink" → Judge backend → Explain evidence
```

**Consequence**: Intuition may be wrong, cannot verify judgment correctness
</error>
</error-map>