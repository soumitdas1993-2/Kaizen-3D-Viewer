import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const publicWasm = join(root, "../public/wasm");
await mkdir(publicWasm, { recursive: true });

const occtEntry = require.resolve("occt-import-js");
const occtDir = dirname(occtEntry);
await cp(join(occtDir, "occt-import-js.js"), join(publicWasm, "occt-import-js.js"));
await cp(join(occtDir, "occt-import-js.wasm"), join(publicWasm, "occt-import-js.wasm"));

const webIfcEntry = require.resolve("web-ifc");
const webIfcDir = dirname(webIfcEntry);
await cp(join(webIfcDir, "web-ifc.wasm"), join(publicWasm, "web-ifc.wasm"));

console.log("Copied OCCT and Web-IFC WebAssembly runtimes.");
