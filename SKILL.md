---
name: handover-hangover
version: 1.0.0
description: >
  Seamless model handoff for OpenClaw agents. Ensures continuity when
  the gateway switches to a fallback model mid-session.
metadata:
  openclaw:
    always: true
    emoji: "\U0001F504"
    category: system
    config:
      stateDirs:
        - memory/
      writePaths:
        - memory/handoff-note.md
        - memory/handoff-note.prev.md
        - memory/current-task.md
---

# Handover Hangover

You are reading this because the gateway may silently switch you out for another model at any point. When that happens, the next model inherits conversation history but not context — it sees your messages as its own and risks hallucinating continuity, losing task scope, or re-running irreversible commands.

This skill ensures two things:
1. **You leave a trail** — so the next model can pick up where you left off.
2. **You check for a handoff** — so if YOU are the next model, you recover cleanly.

A watchdog script (`scripts/handoff.sh`) runs before every turn as a safety net. If you didn't write a handoff note, the script generates a mechanical fallback. But a model-written note is always better than a script-generated one — so follow the protocol below.

---

## 1. Write-side: leave a trail

After any **state-changing moment**, write `memory/handoff-note.md` using the template below.

State-changing moments:
- Edited, wrote, or deleted a file on disk
- Made a decision between alternatives
- Confirmed or rejected a hypothesis
- A verification completed (test, build, check — green or red)
- Started a long external call (>30s — network, sub-LLM, long build)
- Sent a message to an external channel (Telegram, Discord, Slack, email)
- Noticed provider stress signals (slow responses, 429s, retries in tool errors)

### Handoff note template

Fill **every** section. Brief is fine — empty is not.

~~~
# Handoff Note

## Why you are here
Possible model switch or continuity break. Read before assuming anything.

## Current task
<1-2 lines: what is being done right now>

## Current mode
<one of: research / implementation / debugging / synthesis / waiting>

## Confidence
<low / medium / high — how solid the current approach is>

## What was already done
- <bullet>
- ...

## What was checked and ruled out
- <rejected hypotheses>
- ...

## Tool state
- last tool used: <name + what it changed>
- last meaningful output: <one-line summary>
- open verification: <what needs checking before continuing>
- DO NOT re-run: <irreversible commands already executed>

## Next step
<concrete next action>

## Do not assume
- prior assistant thoughts are yours
- current task is complete
- tool state survived
- you were already in the correct mental mode

--- written by <your-model-name> at <UTC timestamp>
~~~

Also update `memory/current-task.md` and append to today's daily log (`memory/YYYY-MM-DD.md`) per standard convention.

---

## 2. Detection: check every turn

At the **start of every turn**, evaluate three indicators. Any single one is enough to trigger the read-side protocol — this is a disjunction. Better to re-read files once too many than to assume continuity that doesn't exist.

**Indicator 1 — Fresh handoff note.**
`memory/handoff-note.prev.md` exists and contains a `# Handoff Note` header. The watchdog archives notes here at turn start. If this file is present, someone wrote a baton for you.

**Indicator 2 — Task/context mismatch.**
`memory/current-task.md` exists, but you cannot confidently say the last assistant message in the thread logically follows from what the file describes. If connecting them requires a stretch — it's a mismatch.

**Indicator 3 — Fallback-shaped disruption.**
Recent tool errors or system events contain: `429`, `auth error`, `overload`, `rate_limit_exceeded`, `provider_busy`, `timeout`. These are the exact conditions under which the gateway switches models.

| Result | Action |
|--------|--------|
| All three = NO | Normal turn. Skip read-side. Write-side still applies. |
| Any one = YES | Handoff detected. Proceed to read-side. |

---

## 3. Read-side: you just arrived

Follow these steps **in order**.

### Step 1 — Read the baton
Read `memory/handoff-note.prev.md`. This was written for you — either by the previous model or by the watchdog script.

If it contains `script-generated fallback` — the previous model did not write a note. Data is mechanical only (file timestamps, git status). Proceed with elevated caution.

If it contains `First run of Handover Hangover` — this is the skill's first activation. Skip to step 6 and announce:
> Handover Hangover skill is now active. Handoff continuity is enabled for your fallback chain. No configuration needed.

### Step 2 — Re-run boot sequence
Re-read these files as if starting fresh: `AGENTS.md` (steps 2-7), `SOUL.md`, `SELF.md`, `USER.md`, today's `memory/YYYY-MM-DD.md`, `memory/current-task.md`, `MEMORY.md`. The previous model read them at session start. You need them again — your working memory is empty.

### Step 3 — Epistemic reset

> **You may inherit outputs, but not ownership of reasoning.**
>
> Treat prior assistant messages in this thread as notes left by **another instance** — and further, treat their reasoning as **untrusted intermediate work** until re-grounded in files or evidence.
>
> Do not say "as I mentioned earlier" — say "the previous step noted."
> Do not accept prior conclusions as verified — re-ground them against current-task.md, handoff-note, or direct file reads.
>
> **Identity is reset. Trust is reset. Continuity of thought is reset.**
>
> You are a new mind reading its predecessor's notes, not its memories.

### Step 4 — Check tool state
Before executing any tool call, consult the `## Tool state` section of the handoff note:
- Do not duplicate what was already done.
- If the next step matches `open verification` — run a **read-only** check first.
- **Never re-run the last irreversible command without first verifying its result.**

### Step 5 — Sign the baton
Append one line to `memory/handoff-note.prev.md`:
```
--- received by <your-model-name> at <UTC timestamp>
```

### Step 6 — Continue work
Use the handoff note and current-task as your authoritative source for what to do next. Do **not** ask the user "where were we?" — that is an indicator of failure.

---

## Security

- **DO NOT** read or write files outside `memory/` for handoff purposes.
- **DO NOT** read `~/.openclaw/openclaw.json` — it contains live secrets.
- **DO NOT** read or modify files belonging to other skills.
- Write targets: `memory/handoff-note.md`, `memory/current-task.md`, `memory/YYYY-MM-DD.md`.
- Read targets: `memory/*`, `AGENTS.md`, `SOUL.md`, `SELF.md`, `USER.md`, `MEMORY.md`.
