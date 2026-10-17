#!/usr/bin/env node
/**
 * Read-only HTTP facade for the TronLink Skills CLI.
 * No signing, private-key handling, shell interpolation, or transaction broadcast.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "scripts/tron_api.mjs");
const port = Number(process.env.PORT || 10000);
const host = "0.0.0.0";
const maxBody = 16 * 1024;
const windowMs = 60_000;
const maxRequests = 30;
const hits = new Map();

const commandOptions = {
  "wallet-balance": ["address"], "token-balance": ["address", "contract"],
  "wallet-tokens": ["address"], "tx-history": ["address", "limit"],
  "account-info": ["address"], "validate-address": ["address"],
  "wallet-approvals": ["address", "limit"], "wallet-overview": ["address"],
  "token-info": ["contract"], "token-search": ["keyword"], "contract-info": ["contract"],
  "token-holders": ["contract", "limit"], "trending-tokens": [],
  "token-rankings": ["sort-by"], "token-security": ["contract"], "token-overview": ["contract"],
  "token-price": ["contract"], "kline": ["contract", "interval", "limit"],
  "trade-history": ["contract", "limit"], "dex-volume": ["contract", "period"],
  "whale-transfers": ["contract", "min-value"], "large-transfers": ["min-trx", "limit"],
  "pool-info": ["contract"], "market-overview": [],
  "swap-quote": ["from-token", "to-token", "amount", "slippage"],
  "swap-route": ["from-token", "to-token", "amount", "slippage"], "tx-status": ["txid"],
  "resource-info": ["address"], "estimate-energy": ["contract", "function", "params", "caller"],
  "estimate-bandwidth": ["tx-size"], "energy-price": [], "bandwidth-price": [],
  "tx-cost": ["type"], "chain-params": [], "energy-rental": ["amount"],
  "optimize-cost": ["address"], "sr-list": ["limit"], "staking-info": ["address"],
  "staking-apy": ["amount"], "health-check": []
};
const requiredOptions = {
  "wallet-balance": ["address"], "token-balance": ["address", "contract"],
  "wallet-tokens": ["address"], "tx-history": ["address"], "account-info": ["address"],
  "validate-address": ["address"], "wallet-approvals": ["address"], "wallet-overview": ["address"],
  "token-info": ["contract"], "token-search": ["keyword"], "contract-info": ["contract"],
  "token-holders": ["contract"], "token-security": ["contract"], "token-overview": ["contract"],
  "token-price": ["contract"], "kline": ["contract"], "trade-history": ["contract"],
  "dex-volume": ["contract"], "whale-transfers": ["contract"], "pool-info": ["contract"],
  "swap-quote": ["from-token", "to-token", "amount"], "swap-route": ["from-token", "to-token", "amount"],
  "tx-status": ["txid"], "resource-info": ["address"],
  "estimate-energy": ["contract", "function", "caller"], "optimize-cost": ["address"],
  "staking-info": ["address"]
};
const numberRules = {
  limit: (n) => Number.isInteger(n) && n >= 1 && n <= 200,
  amount: (n) => Number.isFinite(n) && n > 0,
  slippage: (n) => Number.isFinite(n) && n >= 0 && n <= 50,
  "min-value": (n) => Number.isFinite(n) && n >= 0,
  "min-trx": (n) => Number.isFinite(n) && n >= 0,
  "tx-size": (n) => Number.isInteger(n) && n >= 1 && n <= 1_000_000
};
function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(body);
}
function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBody) {
        reject(Object.assign(new Error("Request body exceeds 16 KB"), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolveBody(JSON.parse(raw || "{}")); }
      catch { reject(Object.assign(new Error("Body must be valid JSON"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function rateLimited(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const old = hits.get(ip);
  const item = !old || now - old.start >= windowMs ? { start: now, count: 0 } : old;
  item.count++;
  hits.set(ip, item);
  return item.count > maxRequests;
}
function runCommand(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const argv = [cli, command];
    for (const key of Object.keys(args)) {
      const value = args[key];
      argv.push(`--${key}`, String(value));
    }
    execFile(process.execPath, argv, { cwd: root, timeout: 30_000, maxBuffer: 512 * 1024, env: process.env }, (error, stdout, stderr) => {
      const output = stdout.trim();
      if (error && !output) return rejectRun(new Error(stderr.trim() || error.message));
      try { resolveRun(JSON.parse(output)); }
      catch { resolveRun({ output: output.slice(0, 100_000), ...(stderr ? { warning: stderr.slice(0, 2000) } : {}) }); }
    });
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/token-studio") {
    try {
      const page = await readFile(resolve(root, "public/token-studio.html"), "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(page);
    } catch {
      return send(res, 500, { error: "Token Studio page is unavailable" });
    }
  }
  if (req.method === "GET" && url.pathname === "/bridge-status") {
    try {
      const page = await readFile(resolve(root, "public/bridge-status.html"), "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      });
      return res.end(page);
    } catch {
      return send(res, 500, { error: "Bridge status helper is unavailable" });
    }
  }
  if (req.method === "GET" && url.pathname === "/demo-funds") {
    try {
      const page = await readFile(resolve(root, "public/demo-funds.html"), "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      return res.end(page);
    } catch {
      return send(res, 500, { error: "Demo credits page is unavailable" });
    }
  }
  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
    return send(res, 200, { status: "ok", service: "tronlink-skills-api", network: process.env.TRON_NETWORK || "mainnet", node: process.version });
  }
  if (req.method === "GET" && url.pathname === "/") {
    return send(res, 200, {
      name: "TronLink Skills API",
      description: "Read-only TRON wallet, token, market, swap-quote, resource, and staking queries, plus a TronLink-connected token transfer page.",
      health: "/health",
      tokenStudio: "/token-studio",
      bridgeStatus: "/bridge-status",
      demoFunds: "/demo-funds",
      commands: Object.keys(commandOptions),
      usage: { method: "POST", path: "/api/command", body: { command: "wallet-balance", args: { address: "T..." } } },
      note: "The JSON API is read-only. Token Studio requests transfers through TronLink, where the user reviews and signs locally. Never submit private keys or seed phrases."
    });
  }
  if (req.method !== "POST" || url.pathname !== "/api/command") {
    return send(res, 404, { error: "Not found", endpoints: ["GET /", "GET /health", "GET /token-studio", "GET /bridge-status", "GET /demo-funds", "POST /api/command"] });
  }
  if (rateLimited(req)) return send(res, 429, { error: "Rate limit exceeded. Try again in one minute." });
  try {
    const body = await readJson(req);
    const command = body.command;
    const args = body.args ?? {};
    if (typeof command !== "string" || !Object.hasOwn(commandOptions, command)) {
      return send(res, 400, { error: "Unknown or unsupported command", allowedCommands: Object.keys(commandOptions) });
    }
    if (!args || typeof args !== "object" || Array.isArray(args)) return send(res, 400, { error: "args must be a JSON object" });
    const allowed = commandOptions[command];
    const keys = Object.keys(args);
    const unknown = keys.filter(key => !allowed.includes(key));
    if (unknown.length) return send(res, 400, { error: "Unsupported argument(s)", arguments: unknown, allowedArguments: allowed });
    for (const key of requiredOptions[command] || []) {
      if (args[key] === undefined || args[key] === null || String(args[key]).trim() === "") return send(res, 400, { error: `Missing required argument: ${key}` });
    }
    for (const [key, value] of Object.entries(args)) {
      if (!["string", "number"].includes(typeof value) || String(value).length > 2000 || String(value).includes("\0")) {
        return send(res, 400, { error: `Invalid value for argument: ${key}` });
      }
      if (numberRules[key]) {
        const n = Number(value);
        if (!numberRules[key](n)) return send(res, 400, { error: `Invalid numeric value for ${key}` });
      }
    }
    const result = await runCommand(command, args);
    return send(res, 200, { command, network: process.env.TRON_NETWORK || "mainnet", result });
  } catch (error) {
    return send(res, error.status || 502, { error: error.status ? error.message : "Command execution failed", detail: error.status ? undefined : error.message });
  }
});
server.listen(port, host, () => console.log(`TronLink Skills API listening on ${host}:${port}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
