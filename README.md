# Trace Debugger Skill

A debugging skill for Claude Code that helps you find and fix bugs through "trace -> analyze -> cleanup".

## How to Use

### Install

```bash
npx skills add https://github.com/bb-boy680/trace-debugger --skill trace-debugger
```

### Run

When you encounter a bug, just say:

```
use trace-debugger to help me fix this bug
```

Or mention keywords like:
- "bug"
- "error"
- "not working"
- "test failed"

The skill will automatically activate.

## What It Does

1. **Add Traces** - Put debug traces in your code
   - Frontend: HTTP fetch
   - Backend: File write
   - No console.log (it breaks async flow)

2. **Analyze & Fix** - Run code, read traces, find the bug, fix it

3. **Cleanup** - Remove all traces after fixing

## Why This Method?

- `console.log` changes async behavior and hides bugs
- HTTP fetch and file write keep the real execution flow
- Traces are easy to find and clean up

## Keywords That Trigger This Skill

- bug, error, exception, debug
- "code not working"
- "test failed"
- "something is wrong"