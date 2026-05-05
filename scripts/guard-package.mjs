import { readFile, stat } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
const dist = await stat(new URL("../dist/src/index.js", import.meta.url));

const runtimeDeps = Object.keys(packageJson.dependencies ?? {});
if (runtimeDeps.length > 0) {
  throw new Error(`Runtime dependencies are not allowed: ${runtimeDeps.join(", ")}`);
}

const blockedImports = [
  "react",
  "d3",
  "cytoscape",
  "elkjs",
  "dagre",
  "reactflow",
  "@xyflow",
];

for (const blocked of blockedImports) {
  if (source.includes(`"${blocked}`) || source.includes(`'${blocked}`)) {
    throw new Error(`Blocked graph/runtime dependency import found: ${blocked}`);
  }
}

const maxBytes = 21_750;
if (dist.size > maxBytes) {
  throw new Error(`dist/src/index.js is ${dist.size} bytes; budget is ${maxBytes} bytes`);
}

console.log(`guard ok: 0 runtime deps, dist/src/index.js ${dist.size} bytes`);
