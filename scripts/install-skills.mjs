#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skillsSource = join(root, "skills");
const startShPath = join(root, "start.sh");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const skills = [
  {
    name: "opencode",
    command: "/opencode",
    description: "delegation guidance for coding tasks",
  },
  {
    name: "opencode-build",
    command: "/opencode-build",
    description: "team build pipeline (fast draft → Claude polish)",
  },
];

const mcpConfig = {
  mcpServers: {
    opencode: {
      command: startShPath,
    },
  },
};

/**
 * Read a JSON file, returning null if it doesn't exist or can't be parsed.
 */
function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Deep-merge mcpServers.opencode into an existing config object.
 */
function mergeMcpConfig(existing) {
  const merged = { ...existing };
  merged.mcpServers = { ...(merged.mcpServers || {}), opencode: { command: startShPath } };
  return merged;
}

/**
 * Write MCP config to a file, merging with existing content.
 * Returns true if written, false if user declined overwrite.
 */
async function writeMcpConfig(filePath, label) {
  const existing = readJson(filePath);

  if (existing?.mcpServers?.opencode) {
    const currentCmd = existing.mcpServers.opencode.command || "(unknown)";
    console.log("");
    console.log(yellow("  !") + ` ${label} already has mcpServers.opencode configured:`);
    console.log(dim(`    command: ${currentCmd}`));
    console.log("");
    const answer = await ask("  Overwrite? [y/N]: ");
    if (answer.trim().toLowerCase() !== "y") {
      console.log(dim("    Skipped MCP config for " + label));
      return false;
    }
  }

  const merged = existing ? mergeMcpConfig(existing) : mcpConfig;
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n");
  return true;
}

async function main() {
  console.log("");
  console.log(bold("  OpenCode MCP — Setup for Claude Code"));
  console.log("");
  console.log("  This will configure:");
  console.log("");
  console.log("    " + bold("Skills") + " (slash commands):");
  for (const skill of skills) {
    console.log(`    ${cyan(skill.command)}${" ".repeat(16 - skill.command.length)}${dim("—")} ${skill.description}`);
  }
  console.log("");
  console.log("    " + bold("MCP Server") + ":");
  console.log("    Connects Claude Code to OpenCode so the tools work");
  console.log("");

  // Ask where to install
  console.log("  Where would you like to install?");
  console.log("");
  console.log(`  ${bold("1.")} Global ${dim("(~/.claude/ — available in all projects)")}`);
  console.log(`  ${bold("2.")} This project only ${dim("(.mcp.json + .claude/skills/)")}`);
  console.log(`  ${bold("3.")} Both`);
  console.log(`  ${bold("4.")} Cancel`);
  console.log("");

  const choice = await ask("  Choose [1-4]: ");

  const installGlobal = ["1", "3"].includes(choice.trim());
  const installLocal = ["2", "3"].includes(choice.trim());

  if (!installGlobal && !installLocal) {
    console.log("");
    console.log(dim("  Cancelled. You can run this again anytime with: npm run install-skills"));
    console.log("");
    rl.close();
    return;
  }

  console.log("");

  const installed = [];

  // --- Global install ---
  if (installGlobal) {
    const claudeDir = join(process.env.HOME || "~", ".claude");

    if (!existsSync(claudeDir)) {
      console.log(yellow("  ! ~/.claude not found — is Claude Code installed?"));
      console.log(dim("    Skipping global install."));
      console.log("");
    } else {
      // Skills
      const skillsDest = join(claudeDir, "skills");
      if (!existsSync(skillsDest)) mkdirSync(skillsDest, { recursive: true });

      for (const skill of skills) {
        const src = join(skillsSource, skill.name);
        if (!existsSync(src)) continue;
        cpSync(src, join(skillsDest, skill.name), { recursive: true });
        console.log(green("  ✓") + ` ${bold(skill.command)}${" ".repeat(16 - skill.command.length)}→ ${dim(join(skillsDest, skill.name))}`);
        installed.push({ label: skill.command, dest: join(skillsDest, skill.name) });
      }

      // MCP config → ~/.claude/settings.json
      const settingsPath = join(claudeDir, "settings.json");
      const wrote = await writeMcpConfig(settingsPath, "~/.claude/settings.json");
      if (wrote) {
        console.log(green("  ✓") + ` ${bold("MCP server")}${" ".repeat(7)}→ ${dim(settingsPath)}`);
        installed.push({ label: "MCP server", dest: settingsPath });
      }
      console.log("");
    }
  }

  // --- Local (project) install ---
  if (installLocal) {
    // Skills
    const skillsDest = join(root, ".claude", "skills");
    if (!existsSync(skillsDest)) mkdirSync(skillsDest, { recursive: true });

    for (const skill of skills) {
      const src = join(skillsSource, skill.name);
      if (!existsSync(src)) continue;
      cpSync(src, join(skillsDest, skill.name), { recursive: true });
      console.log(green("  ✓") + ` ${bold(skill.command)}${" ".repeat(16 - skill.command.length)}→ ${dim(join(skillsDest, skill.name))}`);
      installed.push({ label: skill.command, dest: join(skillsDest, skill.name) });
    }

    // MCP config → .mcp.json
    const mcpJsonPath = join(root, ".mcp.json");
    const wrote = await writeMcpConfig(mcpJsonPath, ".mcp.json");
    if (wrote) {
      console.log(green("  ✓") + ` ${bold("MCP server")}${" ".repeat(7)}→ ${dim(mcpJsonPath)}`);
      installed.push({ label: "MCP server", dest: mcpJsonPath });
    }
    console.log("");
  }

  // --- Summary ---
  if (installed.length > 0) {
    console.log(green("  Done!") + " Restart Claude Code to pick up the changes.");
    console.log("");
    console.log("  You can now use:");
    console.log(`    ${cyan("/opencode")}        ${dim("— delegation guidance")}`);
    console.log(`    ${cyan("/opencode-build")}   ${dim("— team build pipeline")}`);
    console.log("");
  } else {
    console.log(dim("  Nothing was installed."));
    console.log("");
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
