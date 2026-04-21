/**
 * Debugger Server - 接收前端埋点 POST 请求并写入日志文件
 * 目录结构：.debug/logs/{sessionId}.log
 * 端口策略：从 9220 开始自动检测，被占用则 +1 递增
 */

import http from "http";
import path from "path";
import fs from "fs";

const ROOT_DIR = process.cwd();
const DEBUG_DIR = path.join(ROOT_DIR, ".debug");
const LOGS_DIR = path.join(ROOT_DIR, ".debug", "logs");

/**
 * 查找可用端口：从 startPort 开始递增，直到找到未被占用的端口
 */
function findAvailablePort(startPort, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;

    function tryPort(port) {
      if (attempts >= maxAttempts) {
        reject(
          new Error(`找不到可用端口（尝试了 ${startPort}-${startPort + maxAttempts - 1}）`)
        );
        return;
      }
      attempts++;

      const server = http.createServer();
      server.listen(port, () => {
        server.close();
        resolve(port);
      });
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") {
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    }

    tryPort(currentPort);
  });
}

/**
 * 解析请求体
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * 安全提取嵌套属性
 */
function get(obj, path, defaultValue = null) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
}

/**
 * 获取客户端 IP
 */
function getClientIp(req) {
  return (
    get(req, "headers.x-forwarded-for", "")?.split(",")[0] ||
    get(req, "socket.remoteAddress", "unknown")
  );
}

/**
 * 将日志条目追加到对应 session 的日志文件
 */
function appendLog(sessionId, logEntry) {
  if (!LOGS_DIR) return;
  const logFile = path.join(LOGS_DIR, `${sessionId}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}

/**
 * 路由：接收埋点日志
 */
async function handleLogRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("session_id");
  const clientIp = getClientIp(req);

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing session_id parameter" }));
  }

  try {
    const logData = await parseBody(req);
    const timestamp = logData.timestamp || Date.now();

    const logEntry = {
      timestamp,
      level: get(logData, "level", "info"),
      session: sessionId,
      service: get(logData, "service", "debugger-log"),
      client_ip: clientIp,
      user_agent: get(req, "headers.user-agent", ""),
      file: get(logData, "location", get(logData, "file", "")),
      line: get(logData, "line", 0),
      message: get(logData, "message", ""),
      data: get(logData, "data", {}),
      raw: logData,
    };

    appendLog(sessionId, logEntry);

    // 终端打印关键埋点
    const info = logEntry;
    if (info.file) {
      console.log(`[debugger:${sessionId}] ${info.file}:${info.line} ${info.message}`);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "logged" }));
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Bad request: ${err.message}` }));
  }
}

/**
 * 健康检查
 */
function handleHealthCheck(res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "debugger-log" }));
}

/**
 * 请求路由分发
 */
async function routeRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    switch (pathname) {
      case "/health":
        return handleHealthCheck(res);
      case "/debug/log":
        return await handleLogRequest(req, res);
      default:
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: `Not found: ${pathname}` }));
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Internal error: ${err.message}` }));
  }
}

// 启动服务器
const DEFAULT_PORT = 9220;

async function start() {
  // 确保日志目录存在
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  const port = await findAvailablePort(DEFAULT_PORT);
  const server = http.createServer(routeRequest);

  // 优雅关闭
  function shutdown(signal) {
    console.log(`\n[debugger] ${signal} received, shutting down...`);
    server.close(() => {
      console.log("[debugger] HTTP server closed");
      process.exit(0);
    });
    // 强制退出
    setTimeout(() => {
      console.error("[debugger] Forced shutdown");
      process.exit(1);
    }, 3000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  server.on("error", (err) => {
    console.error(`[debugger] Server error: ${err.message}`);
  });

  server.listen(port, () => {
    console.log(`[debugger] Server started on port ${port}`);
    console.log(`[debugger] Logs directory: ${LOGS_DIR}`);
  });
}

start().catch((err) => {
  console.error(`[debugger] Fatal error: ${err.message}`);
  process.exit(1);
});
