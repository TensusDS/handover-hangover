# Handover Hangover

**Seamless model handoff for [OpenClaw](https://openclaw.ai) agents.**

When your agent's primary model hits a rate limit and the gateway silently switches to a fallback, the new model inherits the conversation but not the context. It sees prior assistant messages as *its own*, hallucinates continuity, and may re-run irreversible commands. Handover Hangover fixes this.

## The problem

OpenClaw agents run on a fallback chain — when the primary model is unavailable, the gateway transparently routes to the next one. The conversation history survives, but:

1. **Hallucinated continuity** — treats the previous model's reasoning as its own
2. **Lost task details** — what was being edited, checked, what step comes next
3. **Lost cognitive mode** — was the agent researching, debugging, synthesizing?
4. **Scope collapse** — the task silently narrows ("analyze the past week" → "analyze this session")
5. **Tool state blindness** — risks re-running irreversible commands (duplicate messages, double commits)

## How it works

Handover Hangover is a **three-channel** OpenClaw skill (`always: true`) that uses layered defense to guarantee handoff continuity even when one channel fails:

- **Channel 1: System prompt** (`SKILL.md`) — tells the model *what* to write and *when*
- **Channel 2: Filesystem** (`memory/handoff-note.md`, `memory/current-task.md`) — stores the handoff data
- **Channel 3: Bash watchdog** (`scripts/handoff.sh`) — guarantees the data *exists* at session boundaries, even if the model didn't follow instructions. Requires integration into your boot sequence or heartbeat (see [Integration](#integration))

### Four responsibilities

**Write-side:** on every state-changing moment, the agent writes a structured handoff note to disk — extending OpenClaw's existing `memoryFlush` pattern.

**Detection:** the agent self-checks on every turn whether a model switch may have occurred, using three heuristic indicators. Biased toward false positives — better to re-read state than to assume continuity.

**Read-side:** when a handoff is detected, the incoming model reads the baton, performs an epistemic reset, verifies tool state, and continues work without asking "where were we?"

**Watchdog:** a bash script that checks whether a handoff note exists and generates a mechanical fallback if not. Wire it into your boot sequence and/or heartbeat — OpenClaw does not auto-execute skill scripts. Even if the model ignores every prompt instruction, the next session still gets *something* to work with.

## Installation

Copy to your OpenClaw skills directory:

```bash
git clone https://github.com/tensusds/handover-hangover.git ~/.openclaw/workspace/skills/handover-hangover
```

If you installed via ClawHub instead of git clone, restore the execute bit (ClawHub does not preserve it):

```bash
chmod +x ~/.openclaw/workspace/skills/handover-hangover/scripts/handoff.sh
```

The prompt layer activates automatically (`always: true`). The watchdog script requires integration — see below.

## Integration

OpenClaw skills are prompt-injected — `SKILL.md` loads automatically with `always: true`. But the watchdog script requires explicit wiring into your agent lifecycle.

### Boot sequence (recommended)

Add to `AGENTS.md`, after the existing boot steps:

```bash
# Handover Hangover — archive/generate baton for incoming model
WORKSPACE=~/.openclaw/workspace bash ~/.openclaw/workspace/skills/handover-hangover/scripts/handoff.sh
```

This runs once per session start and covers the most common handoff scenario: a new session after a model switch.

### Heartbeat (optional, stronger coverage)

Add to `HEARTBEAT.md`:

```bash
# Handover Hangover — periodic baton refresh
WORKSPACE=~/.openclaw/workspace bash ~/.openclaw/workspace/skills/handover-hangover/scripts/handoff.sh
```

This catches mid-session switches that happen between session restarts (~30 min resolution).

### What each layer covers

| Layer | Trigger | Covers |
|-------|---------|--------|
| `SKILL.md` (`always: true`) | Every turn | Detection + write-side + read-side protocol |
| Boot sequence | Session start | Watchdog: baton exists at session boundary |
| Heartbeat | ~30 min | Watchdog: catches mid-session dirty switches |

## Requirements

- [OpenClaw](https://openclaw.ai) with a multi-model fallback chain configured
- At least one fallback model in `agents.defaults.model.fallbacks`
- The `context-anchor` skill installed (for read-side file scanning)
- Bash (for the watchdog script — available on all standard OpenClaw environments)

## What Handover Hangover is NOT

- **Not a memory framework** — it's a handoff protocol between interpreters of the same state
- **Not a replacement for compaction flush** — compaction handles "same model, shorter memory"; Handover Hangover handles "different model, same history"
- **Not semantic search** — vector/embedding memory is a separate layer
- **Not cross-session continuity** — that's `continuity`, `MEMORY.md`, and daily logs

## Design principles

- **Three-channel reliability.** System prompt (policy) + filesystem (state) + bash watchdog (enforcement). Each channel compensates for the others' failure modes. The prompt tells the model what to do; the filesystem stores the result; the watchdog guarantees the result exists at session boundaries (see [Integration](#integration)). Pattern borrowed from `context-anchor`.
- **Extend, don't invent.** Uses existing OpenClaw files and conventions (`memory/current-task.md`, `memory/YYYY-MM-DD.md`, `memoryFlush` pattern). The only new files are `memory/handoff-note.md` and `scripts/handoff.sh`.
- **Bias toward false positives.** Better to re-read state unnecessarily than to assume continuity that doesn't exist.
- **Low overhead when not switching.** Every turn performs a cheap baton check (one file read + author comparison). Same-model continuations early-exit without a full reboot; full read-side runs only on actual model change or fallback recovery. Write-side and watchdog run regardless but double as useful compaction insurance.

## Status

**v1.0.3** — core skill (`SKILL.md`) and bash watchdog (`scripts/handoff.sh`) are implemented and tested.

See the [open issues](https://github.com/tensusds/handover-hangover/issues) for current progress.

## License

[MIT](LICENSE) &copy; 2026 TensusDS
