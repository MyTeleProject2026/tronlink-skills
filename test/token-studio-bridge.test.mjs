import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

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


test("Token Studio inline JavaScript parses without syntax errors", () => {
  const scripts = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, "Expected at least one inline script block");
  for (const [index, match] of scripts.entries()) {
    if (!match[1].trim()) continue;
    assert.doesNotThrow(() => new Script(match[1], { filename: `token-studio-inline-${index}.js` }));
  }
});

test("Token Studio explains fee sponsorship honestly and links official free testnet faucets", () => {
  assert.match(page, /id="trxBalance"/);
  assert.match(page, /tw\.trx\.getBalance\(wallet\)/);
  assert.match(page, /Fee assistance and free testing/);
  assert.match(page, /developers\.tron\.network\/docs\/getting-testnet-tokens-on-tron/);
  assert.match(page, /cannot make a Mainnet transfer fee-free by itself/i);
  assert.match(page, /Demo credits is simulated local data|Demo credits are simulated local data|Demo credits.*simulated local data/i);
});

test("Token Studio provides a bounded local TRC-20 portfolio watchlist", () => {
  assert.match(page, /id="addWatchToken"/);
  assert.match(page, /id="refreshWatchlist"/);
  assert.match(page, /WATCHLIST_KEY/);
  assert.match(page, /items\.length>=50/);
  assert.match(page, /Saved for a different network endpoint/);
  assert.match(page, /tokenAddress\.toLowerCase\(\)!==\$\("contract"\)\.value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(page, /Inspect the currently entered token contract before sending/);
});

test("Token Studio makes the TRON-only and local-watchlist scope explicit", () => {
  assert.match(page, /Only add contracts on the active TRON network/);
  assert.match(page, /does not store keys or discover every token automatically/);
  assert.match(page, /Never enter a seed phrase or private key/i);
});
