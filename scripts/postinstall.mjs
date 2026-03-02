#!/usr/bin/env node

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
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

// 4. Check skills
const claudeSkillsDir = join(process.env.HOME || "~", ".claude", "skills");
const skillsInstalled = existsSync(join(claudeSkillsDir, "opencode", "SKILL.md")) &&
                        existsSync(join(claudeSkillsDir, "opencode-build", "SKILL.md"));
if (skillsInstalled) {
  console.log(green("  ✓") + " Claude Code skills installed");
} else {
  console.log(yellow("  !") + " Claude Code skills not installed — run:");
  console.log(dim("    npm run install-skills"));
}

// 5. Check MCP server config
const claudeSettings = join(process.env.HOME || "~", ".claude", "settings.json");
const localMcpJson = join(root, ".mcp.json");

let mcpConfigured = false;
try {
  const settings = JSON.parse(readFileSync(claudeSettings, "utf8"));
  if (settings?.mcpServers?.opencode) mcpConfigured = true;
} catch {}
if (!mcpConfigured) {
  try {
    const local = JSON.parse(readFileSync(localMcpJson, "utf8"));
    if (local?.mcpServers?.opencode) mcpConfigured = true;
  } catch {}
}

if (mcpConfigured) {
  console.log(green("  ✓") + " MCP server configured for Claude Code");
} else {
  console.log(yellow("  !") + " MCP server not configured — run:");
  console.log(dim("    npm run install-skills"));
}

// 6. Summary
console.log("");
if (opencodeFound && envExists && distExists && mcpConfigured) {
  console.log(green("  Ready to go!"));
  if (!skillsInstalled) {
    console.log("");
    console.log(dim("  Optional: npm run install-skills  (adds /opencode and /opencode-build slash commands)"));
  }
} else {
  console.log(bold("  Next steps:"));
  let step = 1;
  if (!envExists) { console.log(dim(`    ${step++}. cp .env.example .env && add your API key`)); }
  if (!distExists) { console.log(dim(`    ${step++}. npm run build`)); }
  if (!mcpConfigured || !skillsInstalled) { console.log(dim(`    ${step++}. npm run install-skills  (configures MCP server + skills)`)); }
}
console.log("");
