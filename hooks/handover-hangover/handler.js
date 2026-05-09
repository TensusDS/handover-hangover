import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HOOK_NAME = "handover-hangover";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function expandHome(p) {
  if (!p || typeof p !== "string") return undefined;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function resolveWorkspace(event) {
  const ctx = event?.context ?? {};
  const cfg = ctx.cfg ?? {};
  const candidate = firstString(
    ctx.workspaceDir,
    cfg.workspace?.dir,
    cfg.agents?.defaults?.workspace,
    process.env.OPENCLAW_WORKSPACE,
    process.env.WORKSPACE,
  );
  return expandHome(candidate);
}

function candidateScripts(workspaceDir) {
  const candidates = [
    // Hook-pack install copies handoff.sh next to handler.js.
    path.join(__dirname, "handoff.sh"),
    // Linked from the skill repo: hooks/handover-hangover -> ../../scripts/handoff.sh.
    path.resolve(__dirname, "..", "..", "scripts", "handoff.sh"),
  ];
  if (workspaceDir) {
    candidates.push(path.join(workspaceDir, "skills", HOOK_NAME, "scripts", "handoff.sh"));
  }
  candidates.push(path.join(os.homedir(), ".openclaw", "workspace", "skills", HOOK_NAME, "scripts", "handoff.sh"));
  return [...new Set(candidates)];
}

function findScript(workspaceDir) {
  for (const candidate of candidateScripts(workspaceDir)) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch {}
  }
  return undefined;
}

function shouldRun(event) {
  if (!event || typeof event.type !== "string") return false;
  if (event.type === "message" && event.action === "received") return true;
  if (event.type === "gateway" && event.action === "startup") return true;
  if (event.type === "command" && (event.action === "new" || event.action === "reset")) return true;
  return false;
}

function runWatchdog(scriptPath, workspaceDir) {
  return new Promise((resolve) => {
    const child = spawn("bash", [scriptPath], {
      env: { ...process.env, WORKSPACE: workspaceDir },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, 5000);
    child.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      console.warn(`[${HOOK_NAME}] watchdog spawn failed: ${error.message}`);
      resolve();
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const out = stdout.trim();
      const err = stderr.trim();
      if (code === 0) {
        if (out) console.log(`[${HOOK_NAME}] ${out.split("\n").slice(-1)[0]}`);
      } else {
        console.warn(`[${HOOK_NAME}] watchdog exited code=${code} signal=${signal ?? "none"}${err ? `: ${err}` : ""}`);
      }
      resolve();
    });
  });
}

export default async function handoverHangoverHook(event) {
  if (!shouldRun(event)) return;
  try {
    const workspaceDir = resolveWorkspace(event);
    if (!workspaceDir) {
      console.warn(`[${HOOK_NAME}] skipped: could not resolve workspace directory`);
      return;
    }
    const scriptPath = findScript(workspaceDir);
    if (!scriptPath) {
      console.warn(`[${HOOK_NAME}] skipped: handoff.sh not found for workspace ${workspaceDir}`);
      return;
    }
    await runWatchdog(scriptPath, workspaceDir);
  } catch (error) {
    console.warn(`[${HOOK_NAME}] failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
