#!/usr/bin/env node

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const localBin = join(root, "node_modules", ".bin", "opencode");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

console.log("");
console.log(bold("  opencode-mcp") + dim(" — post-install check"));
console.log("");

// 1. Check opencode binary
let opencodeVersion = null;
let opencodeFound = existsSync(localBin);

if (!opencodeFound) {
  try {
    execFileSync("which", ["opencode"], { stdio: "ignore" });
    opencodeFound = true;
  } catch {}
}

if (opencodeFound) {
  try {
    const bin = existsSync(localBin) ? localBin : "opencode";
    opencodeVersion = execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();
  } catch {}
  console.log(green("  ✓") + ` OpenCode CLI found${opencodeVersion ? ` (v${opencodeVersion})` : ""}`);
} else {
  console.log(red("  ✗") + " OpenCode CLI not found");
  console.log(yellow("    Run: npm install opencode-ai"));
  console.log("");
}

// 2. Check .env
const envExists = existsSync(join(root, ".env"));
const envExampleExists = existsSync(join(root, ".env.example"));

if (envExists) {
  console.log(green("  ✓") + " .env file found");
} else if (envExampleExists) {
  console.log(yellow("  !") + " No .env file — copy the example and add your API key:");
  console.log(dim("    cp .env.example .env"));
} else {
  console.log(yellow("  !") + " No .env file — create one with your provider API key");
}

// 3. Check if built
const distExists = existsSync(join(root, "dist", "index.js"));
if (distExists) {
  console.log(green("  ✓") + " Built (dist/index.js exists)");
} else {
  console.log(yellow("  !") + " Not built yet — run:");
  console.log(dim("    npm run build"));
}

// 4. Summary
console.log("");
if (opencodeFound && envExists && distExists) {
  console.log(green("  Ready to go!") + " Add to Claude Code:");
  console.log(dim(`    { "mcpServers": { "opencode": { "command": "${join(root, "start.sh")}" } } }`));
} else {
  console.log(bold("  Next steps:"));
  let step = 1;
  if (!envExists) { console.log(dim(`    ${step++}. cp .env.example .env && add your API key`)); }
  if (!distExists) { console.log(dim(`    ${step++}. npm run build`)); }
  console.log(dim(`    ${step}. Add start.sh to your Claude Code MCP config`));
}
console.log("");
