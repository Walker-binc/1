import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve("node_modules/qrious/dist/qrious.min.js");
const target = resolve("vendor/qrious.min.js");

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log(`Copied ${source} -> ${target}`);
