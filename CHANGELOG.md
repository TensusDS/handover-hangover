# Changelog

## [1.0.3] — 2026-04-06

### Fixed
- Documented actual execution model: OpenClaw does not auto-execute skill scripts
- Watchdog script header no longer claims "runs at the start of every turn"

### Added
- Integration section in README with boot sequence and heartbeat wiring examples
- Layer coverage table (`SKILL.md` / boot / heartbeat)
- `CHANGELOG.md` for ClawHub publishing readiness

### Changed
- Channel 3 description reframed as session-boundary guarantee, not per-turn
- "No configuration needed" replaced with integration pointer
- `requires.bins: [bash]` added to SKILL.md frontmatter

## [1.0.2] — 2026-04-06

### Fixed
- Clean model switches no longer bypass detection — `.handoff-pending` signal is now created on every turn (CONFIRMED, DIRTY SWITCH, INIT)
- README "Zero overhead" claim corrected to "Low overhead" to match actual baton-check mechanics

### Added
- Same-model early-exit in read-side Step 1 — skips full reboot when baton author matches current model
- Safe-fail clause: unparseable or mismatched author names degrade to full read-side, not silent skip
- `requires.bins: [bash]` in SKILL.md frontmatter
- `chmod +x` guidance in README installation and SKILL.md INIT onboarding
- CHANGELOG.md

### Changed
- Detection table rewritten for three-row "baton available" semantics
- Indicator 1 description: "anomaly detected" → "baton available for you"
- Version synced across SKILL.md and README.md

## [1.0.1] — 2026-04-06

### Fixed
- Indicator 1 false-positive: replaced `.prev.md` existence check with `.handoff-pending` sentinel
- Privacy boundary: read-side Step 2 now respects `AGENTS.md` boundaries instead of reading all boot files unconditionally

### Changed
- `current-task.md` update frequency clarified (on task change, not every state-changing moment)
- Security section rewritten with explicit write targets and recovery read scope
- `.handoff-pending` added to `writePaths` in frontmatter

## [1.0.0] — 2026-04-06

### Added
- `SKILL.md`: system prompt with write-side protocol, three-indicator detection, read-side with epistemic reset
- `scripts/handoff.sh`: bash watchdog with INIT / CONFIRMED / DIRTY SWITCH scenarios
- `README.md`: project description with three-channel architecture overview
- `.clawhubignore`: excludes internal design documents from ClawHub publishing
