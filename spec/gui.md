<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->

# Desktop GUI

`clincalc` ships a native desktop GUI alongside the CLI. This file is the design spec; the living code lives in [`gui/`](../gui/) and the operational details in [`gui/README.md`](../gui/README.md).

## Goals

1. **Native desktop install** on Windows, macOS, and Linux. Single signed installer per platform; no runtime to pre-install (modern Windows ships WebView2 with Edge, Tauri uses it).
2. **Soft interoperability is the headline.** Every calculator's result is presented as an editable, paste-ready text block with a prominent **Copy** button. Clinician edits before copying are preserved. This is the design feature, not an afterthought.
3. **Same engine, same results.** The GUI calls `clincalc` directly via a Tauri command - no parallel scoring implementation. A FeverPAIN score in the GUI is byte-identical to `clincalc calc feverpain --input ...`.
4. **Sibling product family.** Visual language matches the GitEHR desktop app (IBM Plex Sans + Space Grotesk, teal primary, Mantine components, AppShell + sidebar nav), so a clinician moving between the two apps reads them as one suite.
5. **One UI per calculator, hand-crafted.** No schema-driven form generator. The CLI surface (`clincalc calc <name>` template, `--schema`) handles the generic case; clinician-facing UIs need hand-tuned hints, ordering, and units per calculator.

## Non-goals

- Replacing the CLI. Pipelines, automation, and embedding remain the CLI's job. The GUI is *for clinicians at a desk*; its web build is for evaluating clincalc.
- Storing patient data. The GUI is stateless across sessions; calculations are local and ephemeral. (If a host like GitEHR embeds `clincalc`, *it* records results into its journal - the standalone `clincalc` GUI does not.)
- Cloud sync, accounts, telemetry. Local-first, no network beyond opening links to external references on user click.

## Stack (matches GitEHR)

- **Tauri 2** - Rust backend, system webview frontend, ~10 MB installer.
- **React 19 + Mantine 8 + TypeScript** - component library with strong accessibility defaults and a complete theme system.
- **Vite 7** - build tool / dev server.
- **`@tabler/icons-react`** - icon set used throughout Mantine docs.
- Fonts: **IBM Plex Sans** (body) + **Space Grotesk** (headings), both via Google Fonts.
- Primary colour: **teal** (matches `docs/stylesheets/extra.css`).

## Layout

- AppShell with 56px header + sidebar + main pane. The sidebar defaults to 360px and is user-resizable (260-640px, by drag or arrow keys on its edge, double-click to reset), remembered in `localStorage`; below the `md` breakpoint it becomes a burger menu.
- Layout rules respond to the main pane's width (CSS container queries in `App.css`), not the viewport's, because the sidebar width varies.
- When the main pane is at least 1400px wide, the engine panel moves into a sticky column to the right of the calculator, so the form and its JSON are visible together; otherwise it sits below.
- Sidebar: filter input + "Featured" (FeverPAIN, CHA2DS2-VASc, QRISK3) + "All calculators" alphabetical.
- Each calculator's main pane uses a two-card layout: form on the left, live result on the right.
- The **paste-ready summary** sits below, in a teal-bordered card to draw the eye - this is the headline feature.
- Recompute on every input change. No "Calculate" button. The cost of a round-trip to Rust for any calculator we'd ship is sub-millisecond.

## One frontend, two runtimes

The same React frontend also ships as the **web playground** at <https://ohtf.github.io/clincalc/try/>. `gui/src/api/calc.ts` is the only file that knows which runtime it is in (`isTauri()`): on the desktop it calls the Tauri commands in `src-tauri/src/lib.rs`; in a browser it calls `clincalc-wasm`, the engine compiled to WebAssembly, whose exports mirror those commands exactly. Calculator components never know the difference, so a hand-crafted form lands on both surfaces in the same change.

`vite.config.ts` selects the target: `CLINCALC_TARGET=web` (set by `s/web-build` and `s/web-dev`) aliases `clincalc-wasm` to the real package; the desktop build gets a stub and carries no WebAssembly. Asset paths are relative, so the web build can sit at any subpath.

Web-only differences, all keyed off the runtime rather than separate code paths:

- **Playground notice.** A non-dismissable strip at the top of every page: an evaluation playground, not for clinical decisions about real patients, and nothing entered leaves the browser. This is the per-surface demarcation that `regulatory/position-published-source-not-a-device.md` section 6 calls for; it is not a disclaimer bolted onto a clinical product.
- **Engine panel open by default** (collapsed on the desktop).
- **Mobile layouts matter.** Form and result cards stack when the main pane is under 720px (`.calc-columns` in `App.css`).

`#name` in the URL selects a calculator on both runtimes, so pages are linkable (`try/#acmi`).

## The engine panel ("JSON input")

With every available calculator, hand-crafted or not, sits the engine contract: the exact JSON request the engine received, its JSON response, and the same call as a `clincalc calc` command, a `curl` against `clincalc api`, and a Python snippet. This is deliberate positioning: clincalc is not another web calculator but an engine that EPRs and pipelines can embed, and the panel shows that layer directly.

- For a hand-crafted calculator, the panel follows the form (via the last-calculation record in `api/calc.ts`, so components need no wiring) until the request is edited; "Follow the form" re-attaches it.
- For a calculator without a form, the "Form coming soon" placeholder points to the panel, which starts from the input template `clincalc calc <name>` prints. That is the CLI contract in the browser, not a generated form, so it does not contradict the hand-crafting rule below.
- The panel's own runs are not recorded as form state.

## Implemented baseline

Eleven calculators have hand-crafted forms: FeverPAIN, CHA2DS2-VASc, QRISK3, GCS, CURB-65, NEWS2, Wells PE, QDiabetes-2018, Rockall, PHQ-9, and ACMI. Every other available calculator shows "Form coming soon" plus the engine panel; entries withheld for rights or safety reasons show the engine's unavailability explanation and no panel.

Open GUI and distribution work is tracked by stable ID in [`spec/roadmap.md`](roadmap.md), especially `GUI-*` and `REL-*` items.

## Distribution

Tauri produces `.exe` (NSIS), `.msi`, `.app` / `.dmg`, `.deb` / `.rpm` / `.AppImage` from one codebase. Windows code-signing, updater support, and release cadence are tracked in [`spec/roadmap.md`](roadmap.md).

## Why not auto-generate forms?

A calculator's `input_schema()` is sufficient for the CLI's generic placeholder (one regular shape across 52 calculators is the whole point of the CLI design). But clinical UIs need:

- Question wording that matches how a clinician thinks (not the machine field name).
- Helpful inline hints, units, and ranges per input.
- Ordering by clinical flow, not alphabetical.
- Custom widgets where appropriate (BMI calculator? Date pickers? Visual analogue scales?).
- Sense-checks and warnings the schema can't express ("are you SURE eGFR is < 5?").

A generic form renderer can be *good enough* for an internal admin panel; it is not good enough for a tool a clinician trusts at the bedside. Hand-crafting each form is more work upfront but it is the safe path. The FeverPAIN component (`gui/src/calculators/FeverPain.tsx`) is the reference shape; clone it and adapt.
