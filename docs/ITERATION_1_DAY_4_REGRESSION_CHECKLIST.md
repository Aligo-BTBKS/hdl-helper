# Iteration 1 Day 4 Regression Checklist

**Date**: 2026-04-11  
**Scope**: Compatibility polish and regression closure after Day 3 tree integration

---

## Checklist

- [x] Feature flag switch behavior
  - `hdl-helper.workbench.roleGroupedSources=true` shows `Sources` + `Module Hierarchy (Legacy)`.
  - Config toggle updates tree without manual refresh.

- [x] Sources grouping rendering
  - Design/Simulation/Verification/Constraints/Scripts/IP-Generated/Unassigned groups rendered.
  - Group counts displayed and expandable.

- [x] Legacy fallback preserved
  - Legacy hierarchy section still available.
  - Module/instance recursion unaffected.

- [x] Heuristic compatibility polish
  - Unknown-path HDL files default to `Design` instead of `Unassigned`.
  - Filename overrides still honored: `tb_*` => Simulation, `*_checker`/`*_bind` => Verification.

- [x] Filelist parser Windows path normalization
  - Mixed separator absolute paths normalized via `path.normalize(...)`.
  - Nested filelist + env var test stable on Windows.

- [x] Build & quality gates
  - `npm run -s compile` passed
  - `npm run -s lint` passed
  - `npm -s test` passed (`3 passing`)

---

## Executed Evidence (2026-04-11)

- Compile: pass
- Lint: pass
- Test: pass (`Sample test`, `Filelist parser handles nested filelists and env vars`, `Classification heuristic defaults unknown HDL paths to design`)

---

## Day 4 Result

**Status**: ✅ Regression checklist completed

**Ready for**:
- Commit consolidation
- Next iteration planning
