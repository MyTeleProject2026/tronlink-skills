import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../scripts/http_server.mjs", import.meta.url), "utf8");
const matrix = await readFile(new URL("../docs/MULTICHAIN_SUPPORT_MATRIX.md", import.meta.url), "utf8");

test("capabilities endpoint declares the actual supported networks and operation limits", () => {
  assert.match(server, /url\.pathname === "\/capabilities"/);
  assert.match(server, /tron-mainnet-trx-read/);
  assert.match(server, /tron-trc20-transfer/);
  assert.match(server, /arbitrum-usdt-handoff/);
  assert.match(server, /ethereum-wallet[\s\S]*?status: "not-implemented"/);
  assert.match(server, /bnb-chain-wallet[\s\S]*?status: "not-implemented"/);
  assert.match(server, /polygon-wallet[\s\S]*?status: "not-implemented"/);
  assert.match(server, /solana-wallet[\s\S]*?status: "not-implemented"/);
});

test("capabilities response explicitly rules out fake funds and secret collection", () => {
  assert.match(server, /privateKeysCollected: false/);
  assert.match(server, /seedPhrasesCollected: false/);
  assert.match(server, /fabricatedBalancesOrReceipts: false/);
  assert.match(server, /exchangeCreditGuaranteed: false/);
  assert.match(server, /simulation-only/);
});

test("published support matrix matches the machine-readable capability boundary", () => {
  assert.match(matrix, /Ethereum[\s\S]*?Not implemented/);
  assert.match(matrix, /BNB Smart Chain[\s\S]*?Not implemented/);
  assert.match(matrix, /Polygon[\s\S]*?Not implemented/);
  assert.match(matrix, /Solana[\s\S]*?Not implemented/);
  assert.match(matrix, /does not query blockchains or move funds/i);
});


test("root discovery and 404 endpoint list expose the capabilities route", () => {
  assert.match(server, /capabilities: "\/capabilities"/);
  assert.match(server, /endpoints: \[[^\]]*"GET \/capabilities"/);
});
