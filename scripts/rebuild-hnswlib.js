#!/usr/bin/env node
// Rebuild hnswlib-node native module for current Node.js version
// This is needed because hnswlib-node doesn't ship prebuilt binaries

import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function findHnswlibDir() {
  const pnpmDir = join(process.cwd(), "node_modules", ".pnpm");

  if (!existsSync(pnpmDir)) {
    return null;
  }

  const entries = readdirSync(pnpmDir);
  for (const entry of entries) {
    if (entry.startsWith("hnswlib-node@")) {
      const candidate = join(
        pnpmDir,
        entry,
        "node_modules",
        "hnswlib-node"
      );
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        return candidate;
      }
    }
  }

  return null;
}

const hnswlibDir = findHnswlibDir();

if (!hnswlibDir) {
  console.log("hnswlib-node not found, skipping rebuild");
  process.exit(0);
}

const addonPath = join(hnswlibDir, "build", "Release", "addon.node");
if (existsSync(addonPath)) {
  console.log("hnswlib-node already built, skipping");
  process.exit(0);
}

console.log("Building hnswlib-node native module...");
console.log(`  Directory: ${hnswlibDir}`);

try {
  execSync("npx node-gyp rebuild", {
    cwd: hnswlibDir,
    stdio: "inherit",
  });
  console.log("hnswlib-node build complete");
} catch (error) {
  console.error("Failed to build hnswlib-node:", error.message);
  console.error("You may need to install build tools:");
  console.error("  - macOS: xcode-select --install");
  console.error("  - Ubuntu: apt install python3 make g++");
  console.error("  - Windows: npm install -g windows-build-tools");
  process.exit(1);
}
