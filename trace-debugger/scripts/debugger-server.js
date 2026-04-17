#!/usr/bin/env node

/**
 * Debugger Skill Hook - 启动日志收集服务 (Node.js 版本)
 *
 * 触发时机：skill 激活时自动启动
 * 功能：接收前端埋点日志并写入 .worker/debug/logs/{sessionId}.log
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

// 路径配置
const ROOT_DIR = process.cwd();
const DEBUG_DIR = path.join(ROOT_DIR, ".worker", "debug");
const CONFIG_PATH = path.join(DEBUG_DIR, "config.yaml");
const LOGS_DIR = path.join(ROOT_DIR, ".worker", "debug", "logs");

let PORT = 9229;
try {
  const content = fs.readFileSync(CONFIG_PATH, "utf-8");
  const match = content.match(/^port:\s*(\d+)/m);
  if (match) {
    PORT = parseInt(match[1], 10);
  }
} catch (err) {
  console.error(`[debugger-hook] Error reading config: ${err.message}`);
}

/**
 * 检查端口是否可用
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });
}

/**
 * 确保目录存在
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 解析日志数据中的关键信息
 */
function parseLogInfo(body) {
  try {
    const data = JSON.parse(body);
    return {
      file: data.file || "",
      line: data.line || "",
      func: data.func || "",
    };
  } catch {
    // 尝试正则提取
    const fileMatch = body.match(/"file"\s*:\s*"([^"]+)"/);
    const lineMatch = body.match(/"line"\s*:\s*(\d+)/);
    const funcMatch = body.match(/"func"\s*:\s*"([^"]+)"/);

    return {
      file: fileMatch ? fileMatch[1] : "",
      line: lineMatch ? lineMatch[1] : "",
      func: funcMatch ? funcMatch[1] : "",
    };
  }
}

// 主函数
async function main() {
  // 确保日志目录存在
  ensureDir(LOGS_DIR);

  // 创建 HTTP 服务器
  const server = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // 处理预检请求
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

    // 路由处理
    switch (pathname) {
      case "/health":
        handleHealth(req, res);
        break;
      case "/debug/log":
        handleLog(req, res);
        break;
      default:
        res.writeHead(404);
        res.end("not found");
    }
  });

  // 健康检查端点
  function handleHealth(req, res) {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "debugger-log",
      }),
    );
  }

  // 日志接收端点
  function handleLog(req, res) {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    const { searchParams } = new URL(req.url, `http://localhost:${PORT}`);
    const sessionId = searchParams.get("session_id") || "default";
    const logFile = path.join(LOGS_DIR, `${sessionId}.log`);

    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (body) {
        // 写入日志文件
        fs.appendFileSync(logFile, body + "\n");

        // 解析并输出关键信息到控制台
        const info = parseLogInfo(body);
        if (info.file) {
          console.log(`[debugger:${sessionId}] ${info.file}:${info.line} ${info.func}`);
        }
      }

      res.writeHead(200);
      res.end("ok");
    });

    req.on("error", (err) => {
      console.error(`[debugger-hook] Request error: ${err.message}`);
      res.writeHead(500);
      res.end("error");
    });
  }

  // 启动服务器
  server.listen(PORT, () => {
    console.log(`[debugger-hook] Server started on port ${PORT}`);
  });

  // 处理服务器错误（如端口被占用）
  server.on("error", (err) => {
    process.exit(1);
  });

  // 优雅退出处理
  function shutdown() {
    console.log("\n[debugger-hook] Shutting down...");
    server.close(() => {
      process.exit(0);
    });

    // 强制退出超时
    setTimeout(() => {
      console.error("[debugger-hook] Forced shutdown");
      process.exit(1);
    }, 5000);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGUSR2", shutdown); // nodemon 重启信号
}


checkPortAvailable(PORT)
  .then(async () => {
    await main().catch((err) => {
      console.error(`[debugger-hook] Server error: ${err.message}`);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error(`[debugger-hook] Fatal error: ${err.message}`);
    process.exit(1);
  });
