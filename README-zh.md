# Trace Debug Skill

中文文档 | [English](README.md)

一个用于 Claude Code 的调试技能，通过"埋点 -> 分析 -> 清理"流程帮你定位并修复 bug。

## 如何使用

### 安装

```bash
npx skills add https://github.com/bb-boy680/trace-debug --skill trace-debug
```

### 运行

遇到 bug 时，只需说：

```
use trace-debug to help me fix this bug
```

或提及以下关键词：
- "bug"
- "error"
- "not working"
- "test failed"

技能会自动激活。

## 它做了什么

1. **添加埋点** - 在代码中放置调试埋点
   - 前端：HTTP fetch
   - 后端：文件写入
   - 不使用 console.log（它会破坏异步流程）

2. **分析 & 修复** - 运行代码，读取埋点日志，找到 bug，修复它

3. **清理** - 修复完成后移除所有埋点

## 为什么用这种方法？

- `console.log` 会改变异步行为并隐藏 bug
- HTTP fetch 和文件写入保持真实的执行流程
- 埋点易于查找和清理

## 触发此技能的关键词

- bug, error, exception, debug
- "code not working"
- "test failed"
- "something is wrong"