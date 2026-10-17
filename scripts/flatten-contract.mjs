import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve("contracts/CustomTRC20.sol");
const output = resolve("flattened/CustomTRC20_flat.sol");
const sourceText = await readFile(source, "utf8");
if (/^\s*import\s/m.test(sourceText)) {
  throw new Error("CustomTRC20.sol now contains imports; use a real Solidity flattener before publishing verification source.");
}
await mkdir(dirname(output), { recursive: true });
await copyFile(source, output);
const flattenedText = await readFile(output, "utf8");
if (sourceText !== flattenedText) {
  throw new Error("Flattened source differs from the canonical source.");
}
console.log("Flattened verification source generated from contracts/CustomTRC20.sol");
console.log("No imports are present; source content matches byte-for-byte.");
