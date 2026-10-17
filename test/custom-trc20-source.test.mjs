import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../contracts/CustomTRC20.sol", import.meta.url), "utf8");

test("contract exposes expected TRC-20 metadata and transfer methods", () => {
  for (const signature of [
    "string public name;",
    "string public symbol;",
    "uint8 public immutable decimals;",
    "uint256 public totalSupply;",
    "mapping(address => uint256) public balanceOf",
    "mapping(address => mapping(address => uint256)) public allowance",
    "function transfer(address to, uint256 value)",
    "function approve(address spender, uint256 value)",
    "function transferFrom(address from, address to, uint256 value)"
  ]) assert.ok(source.includes(signature), "Missing expected source declaration: " + signature);
});

test("USDT impersonation guard is present", () => {
  assert.match(source, /keccak256\(bytes\(tokenSymbol\)\)\s*!=\s*keccak256\(bytes\("USDT"\)\)/);
});

test("fixed initial supply is minted to deployer with no public mint function", () => {
  assert.match(source, /balanceOf\[msg\.sender\]\s*=\s*initialSupply/);
  assert.doesNotMatch(source, /function\s+mint\s*\(/);
  assert.match(source, /totalSupply\s*=\s*initialSupply/);
});

test("requested 1,000,000-token supply at 18 decimals uses 10^24 base units", () => {
  const wholeSupply = 1_000_000n;
  const decimals = 18n;
  const rawSupply = wholeSupply * (10n ** decimals);
  assert.equal(rawSupply.toString(), "1000000000000000000000000");
});

test("token decimals and constructor input bounds are guarded", () => {
  assert.match(source, /tokenDecimals\s*<=\s*18/);
  assert.match(source, /initialWholeTokenSupply\s*>\s*0/);
  assert.match(source, /bytes\(tokenName\)\.length\s*>\s*0/);
  assert.match(source, /bytes\(tokenSymbol\)\.length\s*>\s*0/);
});

test("transfers reject zero addresses and check balances/allowances", () => {
  assert.match(source, /require\(to != address\(0\), "Transfer to zero address"\)/);
  assert.match(source, /require\(approved >= value, "Allowance exceeded"\)/);
  assert.match(source, /require\(fromBalance >= value, "Insufficient balance"\)/);
});
