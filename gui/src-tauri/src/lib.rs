// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Tauri 2 desktop GUI for the open clinical calculators.
//!
//! All real scoring lives in `clincalc`; this crate is purely the
//! webview-to-Rust bridge plus the bundled-binary build. Every Tauri
//! command is a thin wrapper that hands a JSON value to `clincalc` and
//! returns the same `CalculationResponse` shape every surface produces -
//! so the GUI, the CLI, and any MCP host yield byte-identical output.
//!
//! The frontend (React + Mantine + Vite) lives at `gui/src/` and is built
//! to `gui/dist/` for production bundling.

use clincalc::{CalculationResponse, SupportedLocale};
use serde::Serialize;

/// One row of the catalogue, suitable for sidebar / picker rendering.
///
/// Mirrors what `clincalc list --format json` returns, kept deliberately small.
#[derive(Debug, Serialize)]
struct CalcSummary {
    name: &'static str,
    title: &'static str,
    description: &'static str,
    /// The locale this title/description actually render in: `locale` when
    /// the calculator has a complete bundle for it, otherwise `en`. Mirrors
    /// the REST catalogue endpoint's per-entry `content_locale`.
    content_locale: &'static str,
    tags: &'static [&'static str],
    /// True for confirmed proprietary or licence-locked entries.
    proprietary: bool,
    /// True when invoking the entry returns an explanation instead of a score.
    unavailable: bool,
}

/// Resolve a requested BCP 47 tag to a compiled locale, falling back to
/// English for a missing or unrecognised request. The GUI's locale selector
/// only ever offers [`compiled_locales`]'s own values, so this never needs to
/// reject a request the way the REST/CLI surfaces do for an arbitrary
/// caller-supplied string.
fn resolve_gui_locale(locale: Option<&str>) -> SupportedLocale {
    locale
        .and_then(|tag| clincalc::lookup_locale(tag, clincalc::COMPILED_LOCALES))
        .unwrap_or_default()
}

/// Every locale bundle compiled into this build, for the GUI's locale picker.
/// Keeps the frontend from hard-coding a list that could drift from the engine.
#[tauri::command]
fn compiled_locales() -> Vec<&'static str> {
    clincalc::COMPILED_LOCALES
        .iter()
        .map(|locale| locale.as_bcp47())
        .collect()
}

#[tauri::command]
fn list_calculators(locale: Option<&str>) -> Vec<CalcSummary> {
    let requested = resolve_gui_locale(locale);
    clincalc::all()
        .iter()
        .map(|c| {
            let tags = c.tags();
            let content_locale = if c.supported_locales().contains(&requested) {
                requested
            } else {
                SupportedLocale::En
            };
            CalcSummary {
                name: c.name(),
                title: c.title_for(content_locale),
                description: c.description_for(content_locale),
                content_locale: content_locale.as_bcp47(),
                tags,
                proprietary: tags.contains(&"proprietary"),
                unavailable: tags.contains(&"unavailable"),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalogue_distinguishes_all_unavailable_entries() {
        let calculators = list_calculators(None);
        let sad_persons = calculators
            .iter()
            .find(|calculator| calculator.name == "sad_persons")
            .unwrap();
        let frax = calculators
            .iter()
            .find(|calculator| calculator.name == "frax")
            .unwrap();
        let feverpain = calculators
            .iter()
            .find(|calculator| calculator.name == "feverpain")
            .unwrap();

        assert!(sad_persons.unavailable);
        assert!(!sad_persons.proprietary);
        assert!(frax.unavailable);
        assert!(frax.proprietary);
        assert!(!feverpain.unavailable);
    }

    #[test]
    fn unrecognised_locale_falls_back_to_english() {
        let calculators = list_calculators(Some("not-a-real-tag"));
        let feverpain = calculators
            .iter()
            .find(|calculator| calculator.name == "feverpain")
            .unwrap();
        assert_eq!(feverpain.content_locale, "en");
        assert_eq!(feverpain.title, "FeverPAIN Score");
    }

    #[test]
    fn input_template_matches_the_cli_template() {
        assert_eq!(
            input_template("acmi", None).unwrap(),
            clincalc::get("acmi").unwrap().input_template()
        );
        assert_eq!(
            input_template("nope", None).unwrap_err(),
            "unknown calculator: nope"
        );
    }

    #[test]
    fn compiled_locales_lists_every_compiled_bundle() {
        assert_eq!(compiled_locales(), vec!["en", "es", "ca"]);
    }
}

/// Compute a result from a JSON input. The frontend is responsible for
/// building the input object that matches the calculator's schema; this
/// command simply hands it to `clincalc` and surfaces the typed response
/// (or the typed error message).
#[tauri::command]
fn calculate(
    name: &str,
    input: serde_json::Value,
    locale: Option<&str>,
) -> Result<CalculationResponse, String> {
    let calc = clincalc::get(name).ok_or_else(|| format!("unknown calculator: {name}"))?;
    calc.calculate_for(&input, resolve_gui_locale(locale))
        .map_err(|e| e.to_string())
}

/// The fillable input template `clincalc calc <name>` prints.
#[tauri::command]
fn input_template(name: &str, locale: Option<&str>) -> Result<serde_json::Value, String> {
    let calc = clincalc::get(name).ok_or_else(|| format!("unknown calculator: {name}"))?;
    Ok(calc.input_template_for(resolve_gui_locale(locale)))
}

/// The `clincalc` version this app was built from (kept in lockstep with the
/// engine by `s/check-release-version`).
#[tauri::command]
fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    // Agent-driven GUI automation (screenshots, DOM, console logs, IPC) for
    // development only; never compiled into release builds. Bound to
    // localhost rather than the plugin's 0.0.0.0 default, which would
    // otherwise expose this debug bridge to the whole LAN.
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(
            tauri_plugin_mcp_bridge::Builder::new()
                .bind_address("127.0.0.1")
                .build(),
        );
    }

    builder
        .invoke_handler(tauri::generate_handler![
            list_calculators,
            calculate,
            compiled_locales,
            input_template,
            engine_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
