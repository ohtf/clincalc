# clincalc desktop GUI

Tauri 2 + React 19 + Mantine 8 + Vite 7, matching the GitEHR house-style frontend stack while using a quieter Lato typeface and the same teal primary.

Status: **MVP**. Every available calculator in the registry has a hand-crafted form, built on the shared kit in `src/kit/`. A calculator added to the engine without a form still runs here, through the JSON input panel and a "Form coming soon" placeholder. Entries withheld for rights or clinical-safety reasons instead show the engine's exact unavailability explanation and never imply that scoring logic ships or is planned.

## Architecture

```
gui/
├── package.json           React / Mantine / Tauri JS deps
├── vite.config.ts         Tauri-aware Vite config (port 5173, no auto-open)
├── tsconfig.json
├── index.html             Loads Lato
├── public/
│   └── logo.svg           function-variant icon, currentColor for CSS theming
├── src/
│   ├── main.tsx           Mantine theme (teal, Lato)
│   ├── App.tsx            AppShell + sidebar nav + filter + locale picker
│   ├── App.css            Thin overrides on top of Mantine
│   ├── api/calc.ts        Engine transport: Tauri invoke (desktop) or WebAssembly (web)
│   ├── EnginePanel.tsx    "JSON input" panel: the engine contract for every calculator
│   ├── locale.ts          Current-locale store, HTML lang/dir, RTL readiness
│   └── calculators/
│       ├── Acmi.tsx
│       ├── Cha2ds2Vasc.tsx
│       ├── Curb65.tsx
│       ├── FeverPain.tsx
│       ├── Gcs.tsx
│       ├── News2.tsx
│       ├── Phq9.tsx
│       ├── Qdiabetes.tsx
│       ├── Qrisk3.tsx
│       ├── Rockall.tsx
│       └── WellsPe.tsx
└── src-tauri/
    ├── Cargo.toml         Excluded from the calc workspace (own Cargo.lock)
    ├── tauri.conf.json
    ├── capabilities/      Window permissions
    ├── icons/             32/128/256/.ico/.icns (.icns is currently a renamed PNG; needs real iconutil on macOS)
    └── src/lib.rs         Tauri commands: list_calculators, calculate, compiled_locales
```

The Tauri backend is a thin wrapper: `list_calculators` enumerates `clincalc::all()` into a `CalcSummary` shape the frontend can render; `calculate` takes a name + JSON input and returns the same `CalculationResponse` shape every surface produces. **No scoring logic lives in the GUI** - everything defers to `clincalc`.

## Locale

The header carries a locale picker (`App.tsx`'s `LocalePicker`), populated from the `compiled_locales` command rather than a hard-coded list. `src/locale.ts` holds the current selection as a plain module-level value - not React state - because `api/calc.ts` reads it from ordinary async functions, not hooks; every `list_calculators`/`calculate` call picks up whichever locale is current when it fires. Components that need to re-render on a change (the picker itself, and `App.tsx`'s effect that sets `document.documentElement.lang`/`dir`) subscribe via the `useLocale()` hook. `textDirectionFor` is ready for a right-to-left bundle the day one is compiled; today `en`/`es`/`ca` are all left-to-right.

No calculator has a non-English translation bundle yet (see `ENG-001.5`/`spec/multilingual.md`), so picking `es` or `ca` today only proves the plumbing: every title, description, and computed result still falls back to English (`content_locale: "en"` in both `CalcSummary` and `CalculationResponse.working`) exactly as the CLI/REST/MCP surfaces already do. This is the GUI closing out `ENG-001.6`, not a translated UI.

## Adding a calculator UI

Create one file, `src/calculators/<Name>.tsx`, built on the kit in `src/kit/`, and export `calculator`:

```tsx
export const calculator: CalculatorModule = { name: "bmi", Component: BmiCalculator };
```

That is all the wiring: `App.tsx` collects every file's `calculator` export with `import.meta.glob`, so the form appears in the desktop app and the web playground at once. `Bmi.tsx` (numbers), `Centor.tsx` (criteria plus a number), and `Heart.tsx` (choices with points) are the reference shapes.

- **`CalculatorPage`** is the whole page: header, form card, live result card, and the editable paste-ready summary. You supply the fields, the headline (`result`), optional `details`, and the `summary` text.
- **`useCalculation(name, input)`** recomputes on every change. Pass `null` until the form is complete: the engine is never called with a partial or out-of-range input, and a result never outlives the input that produced it.
- **Fields**: `YesNoField` (criteria whose absence is the default), `ChoiceField` (fixed options; show points in labels where the source defines them), `NumberField` (a unit, the schema's `minimum`/`maximum`, and `inRange` for completeness).
- **Results**: `ScoreTile` and `Facts`; `summaryText`, `fmt`, `asText`, and `compact` for text and optional fields.

Rules that keep the forms clinically safe:

- Numbers start **empty**, never at a "typical" value, and an empty field is never sent as `0`. `NumberField` flags out-of-range values instead of clamping them.
- Choices with no safe default start unselected; the form stays incomplete until the clinician answers.
- Wording, hints, units, and ranges come from the calculator's schema and its Rust module (which cites the primary source), not from memory. Band names and colours come from the engine's own `working` values; where the source publishes no bands, leave the tile teal rather than inventing them.

Do not try to auto-generate the form from `input_schema()`. The schema is sufficient for the CLI's generic template, but clinician-facing forms need hand-tuned hints, ordering, and units per calculator. Madness lies that way.

## Local dev

One-off setup:

```bash
cd gui
npm install
# also install the Tauri prerequisites for your OS:
# https://tauri.app/start/prerequisites/
```

Then from anywhere in the repo:

```bash
s/gui-dev
```

That runs the Tauri CLI, which boots Vite (port 5173) and the Rust backend together with hot reload on both sides.

## Web playground (same frontend, WebAssembly engine)

This frontend is also the browser playground at <https://ohtf.github.io/clincalc/try/>. `src/api/calc.ts` picks the transport at runtime: Tauri `invoke` on the desktop, `clincalc-wasm` (the engine compiled to WebAssembly, in `../clincalc-wasm/`) in a browser. See [`spec/gui.md`](../spec/gui.md#one-frontend-two-runtimes).

One-off setup, in addition to `npm install`:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.130 --locked   # must match clincalc-wasm/Cargo.toml
```

Then:

```bash
s/web-dev            # http://127.0.0.1:5174, hot reload on the React side
s/web-build          # static site in gui/dist-web/ (relative paths; serve from any subpath)
```

The Pages deploy (`.github/workflows/docs.yml`) runs `s/web-build site/try` after building the Zensical docs.

## Production build

```bash
cd gui
npm install
npm run tauri build
```

Outputs:

- **Windows**: NSIS `.exe` installer + MSI in `src-tauri/target/release/bundle/`.
- **macOS**: `.app` + `.dmg`. The bundled `.icns` is currently a renamed PNG; for production macOS builds, regenerate it on a Mac with `iconutil -c icns icon.iconset`.
- **Linux**: `.deb`, `.rpm`, `.AppImage`.

## Linux WebKitGTK diagnostics

Tauri 2 uses Wry/WebKitGTK on Linux, so scrolling and compositor performance can vary by distro, desktop, GPU, and driver. The current development machine reports `webkit2gtk-4.1: 2.52.4` on Wayland/NVIDIA; upstream Tauri/Wry issues such as `tauri-apps/tauri#14963` and `tauri-apps/wry#890` track the broader WebKitGTK performance problem.

Useful short diagnostics after `npm run tauri -- build --no-bundle`:

```bash
timeout 8s gui/src-tauri/target/release/calc-gui
WEBKIT_DISABLE_COMPOSITING_MODE=1 timeout 8s gui/src-tauri/target/release/calc-gui
WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 8s gui/src-tauri/target/release/calc-gui
LIBGL_ALWAYS_SOFTWARE=1 timeout 8s gui/src-tauri/target/release/calc-gui
```

Treat these as diagnostic switches, not defaults. In local testing all variants launched and stayed up until `timeout`; `LIBGL_ALWAYS_SOFTWARE=1` emitted an NVIDIA/libEGL warning and is likely only useful to confirm a GPU/compositor path issue.

### `s/gui-dev` window opens blank on first launch

This is **not** a WebKitGTK/GPU/compositor bug, despite how it looks. It is an intermittent cold-start race between the Tauri webview's first navigation and the Vite dev server actually being ready to serve a working module graph: Tauri's `beforeDevCommand`/`devUrl` wait for the Vite port to open, not for Vite to finish its initial dependency pre-bundle. When the webview's first request loses that race, `src/main.tsx` fetches fine (200 OK, valid JS) but never mounts React into `#root` - no thrown error, no console output, just a silently empty page. It doesn't happen on every launch.

**Fix: reload the window once** (Ctrl+Shift+R). It recovers instantly and reliably, because by then Vite is warm.

This was diagnosed with the debug-only `tauri-plugin-mcp-bridge` (see `src-tauri/src/lib.rs`), which exposes webview console logs and DOM state over a local WebSocket - the only way to see that `#root` was empty with zero JS errors, rather than guessing from native window screenshots. Every WebKitGTK rendering workaround above (`WEBKIT_DISABLE_*`, `GDK_BACKEND=x11`, a poisoned `~/.cache/fontconfig`, niri/wlroots compositor quirks) was ruled out this way before the actual mechanism was found; none of them touch this symptom, because the bug is upstream of rendering entirely.

## Windows code signing

Not configured yet. When the EV cert from SSL.com / Sectigo arrives, point Tauri at it via `bundle.windows.certificateThumbprint` (or the env vars `TAURI_SIGNING_CERTIFICATE_THUMBPRINT` etc.). Without a cert, Windows SmartScreen shows the "Windows protected your PC" dialog on first run and users must click "More info → Run anyway".

## Workspace placement

`gui/src-tauri/` is **excluded** from the calc Cargo workspace (root `Cargo.toml` `exclude = ["gui/src-tauri"]`). This is the same arrangement GitEHR uses: Tauri pulls in a very different dependency graph (tao, wry, webkit bindings) that would slow down every `cargo build` for the engine + CLI. The GUI has its own `Cargo.lock`.
