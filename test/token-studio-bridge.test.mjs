import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../public/token-studio.html", import.meta.url), "utf8");
const server = await readFile(new URL("../scripts/http_server.mjs", import.meta.url), "utf8");
const bridgePage = await readFile(new URL("../public/bridge-status.html", import.meta.url), "utf8");

test("Token Studio Meson tracker controls exist and are safely wired", () => {
  assert.match(page, /id="mesonSwapId"/);
  assert.match(page, /id="trackMeson"/);
  assert.match(page, /if\s*\(\$\("trackMeson"\)\)\s*\$\("trackMeson"\)\.addEventListener/);
});

test("Meson tracker validates a 32-byte hexadecimal swap ID before opening Explorer", () => {
  assert.match(page, /\^\[0-9a-fA-F\]\{64\}\$/);
  assert.match(page, /https:\/\/explorer\.meson\.fi\/swap\/0x/);
  assert.match(page, /noopener,noreferrer/);
  assert.match(page, /does not independently verify or fetch settlement status/i);
});

test("bridge status route serves a read-only page with no-store security headers", () => {
  assert.match(server, /url\.pathname === "\/bridge-status"/);
  assert.match(server, /resolve\(root, "public\/bridge-status\.html"\)/);
  assert.match(server, /"Cache-Control": "no-store"/);
  assert.match(server, /"Referrer-Policy": "no-referrer"/);
  assert.match(bridgePage, /does not independently verify/i);
});

test("wallet transaction status strings use newline escapes rather than literal backslash-n", () => {
  assert.ok(page.includes('say("Transaction submitted: "+txid+"\\nChecking chain confirmation…");'));
  assert.ok(page.includes('say("Transaction confirmed on TRON: "+txid+"\\nRefreshing token balance…");'));
  assert.equal(page.includes('txid+"\\\\nChecking chain confirmation'), false);
});
