#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const skillsSource = join(root, "skills");

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
    description: "Helps Claude decide when to delegate code generation to fast models vs write directly",
  },
  {
    name: "opencode-build",
    command: "/opencode-build",
    description: "Runs the full team pipeline: fast model drafts in ~2s, Claude reviews and polishes",
  },
];

async function main() {
  console.log("");
  console.log(bold("  OpenCode Skills for Claude Code"));
  console.log("");
  console.log("  This will install two slash commands into Claude Code:");
  console.log("");
  for (const skill of skills) {
    console.log(`  ${cyan(skill.command)}  ${dim("—")} ${skill.description}`);
  }
  console.log("");

  // Ask where to install
  console.log("  Where would you like to install the skills?");
  console.log("");
  console.log(`  ${bold("1.")} Global ${dim("(~/.claude/skills/ — available in all projects)")}`);
  console.log(`  ${bold("2.")} This project only ${dim("(.claude/skills/ — only this repo)")}`);
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

  if (installGlobal) {
    const claudeDir = join(process.env.HOME || "~", ".claude");
    const dest = join(claudeDir, "skills");

    if (!existsSync(claudeDir)) {
      console.log(yellow("  ! ~/.claude not found — is Claude Code installed?"));
      console.log(dim("    Skipping global install."));
    } else {
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

      for (const skill of skills) {
        const src = join(skillsSource, skill.name);
        if (!existsSync(src)) continue;
        cpSync(src, join(dest, skill.name), { recursive: true });
        console.log(green("  ✓") + ` ${bold(skill.command)} → ${dim(join(dest, skill.name))}`);
      }
      console.log(dim("    Available globally in all Claude Code sessions"));
      console.log("");
    }
  }

  if (installLocal) {
    const dest = join(root, ".claude", "skills");
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

    for (const skill of skills) {
      const src = join(skillsSource, skill.name);
      if (!existsSync(src)) continue;
      cpSync(src, join(dest, skill.name), { recursive: true });
      console.log(green("  ✓") + ` ${bold(skill.command)} → ${dim(join(dest, skill.name))}`);
    }
    console.log(dim("    Available when working in this project"));
    console.log("");
  }

  console.log(green("  Done!") + " Skills installed. In Claude Code you can now use:");
  console.log("");
  console.log(`  ${cyan("/opencode")}        ${dim("— delegation guidance for any coding task")}`);
  console.log(`  ${cyan("/opencode-build")}   ${dim("— full team build pipeline (fast draft → Claude polish)")}`);
  console.log("");
  console.log(dim("  The skills also trigger automatically when relevant — you don't always need the slash command."));
  console.log("");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
