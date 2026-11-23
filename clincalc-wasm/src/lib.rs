// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! `clincalc` compiled to WebAssembly for the browser playground.
//!
//! Each export mirrors a Tauri command in `gui/src-tauri/src/lib.rs`, so the
//! React frontend sees the same contract whether it runs on the desktop or in
//! a browser. Values cross the boundary as JSON strings: the engine already
//! speaks JSON, and it keeps this crate to `wasm-bindgen` alone.

use clincalc::{CalculationResponse, SupportedLocale};
use serde::Serialize;
use serde_json::Value;
use wasm_bindgen::prelude::*;

#[derive(Debug, Serialize)]
struct CalcSummary {
    name: &'static str,
    title: &'static str,
    description: &'static str,
    content_locale: &'static str,
    tags: &'static [&'static str],
    proprietary: bool,
    unavailable: bool,
}

fn resolve_locale(locale: Option<String>) -> SupportedLocale {
    locale
        .as_deref()
        .and_then(|tag| clincalc::lookup_locale(tag, clincalc::COMPILED_LOCALES))
        .unwrap_or_default()
}

fn to_json(value: &impl Serialize) -> String {
    serde_json::to_string(value).expect("engine types always serialise")
}

/// The `clincalc` version this module was compiled from.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen]
pub fn compiled_locales() -> String {
    let tags: Vec<&str> = clincalc::COMPILED_LOCALES
        .iter()
        .map(|locale| locale.as_bcp47())
        .collect();
    to_json(&tags)
}

#[wasm_bindgen]
pub fn list_calculators(locale: Option<String>) -> String {
    let requested = resolve_locale(locale);
    let summaries: Vec<CalcSummary> = clincalc::all()
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
        .collect();
    to_json(&summaries)
}

/// Compute a result. `input_json` is the calculator's input object as JSON;
/// errors come back as the engine's own message, exactly as the desktop GUI,
/// CLI, and REST API report them.
#[wasm_bindgen]
pub fn calculate(name: &str, input_json: &str, locale: Option<String>) -> Result<String, String> {
    let calc = clincalc::get(name).ok_or_else(|| format!("unknown calculator: {name}"))?;
    let input: Value =
        serde_json::from_str(input_json).map_err(|e| format!("input is not valid JSON: {e}"))?;
    let response: CalculationResponse = calc
        .calculate_for(&input, resolve_locale(locale))
        .map_err(|e| e.to_string())?;
    Ok(to_json(&response))
}

/// The fillable input template `clincalc calc <name>` prints.
#[wasm_bindgen]
pub fn input_template(name: &str, locale: Option<String>) -> Result<String, String> {
    let calc = clincalc::get(name).ok_or_else(|| format!("unknown calculator: {name}"))?;
    Ok(to_json(&calc.input_template_for(resolve_locale(locale))))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_matches_the_engine() {
        assert_eq!(version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn catalogue_lists_every_registered_calculator() {
        let list: Vec<Value> = serde_json::from_str(&list_calculators(None)).unwrap();
        assert_eq!(list.len(), clincalc::all().len());
        let acmi = list.iter().find(|c| c["name"] == "acmi").unwrap();
        assert_eq!(acmi["content_locale"], "en");
        assert_eq!(acmi["unavailable"], false);
    }

    #[test]
    fn calculate_matches_the_engine_byte_for_byte() {
        let input = r#"{"medications":["amantadine","isosorbide"]}"#;
        let via_wasm = calculate("acmi", input, None).unwrap();
        let direct = clincalc::get("acmi")
            .unwrap()
            .calculate_for(&serde_json::from_str(input).unwrap(), SupportedLocale::En)
            .unwrap();
        assert_eq!(via_wasm, serde_json::to_string(&direct).unwrap());
    }

    #[test]
    fn errors_are_engine_messages() {
        assert_eq!(
            calculate("nope", "{}", None).unwrap_err(),
            "unknown calculator: nope"
        );
        assert!(
            calculate("acmi", "{not json", None)
                .unwrap_err()
                .starts_with("input is not valid JSON")
        );
        assert!(calculate("acmi", r#"{"medications":["ibuprofen"]}"#, None).is_err());
    }

    #[test]
    fn template_matches_the_cli_template() {
        let template: Value = serde_json::from_str(&input_template("acmi", None).unwrap()).unwrap();
        assert_eq!(template, clincalc::get("acmi").unwrap().input_template());
    }

    #[test]
    fn unrecognised_locale_falls_back_to_english() {
        let list: Vec<Value> =
            serde_json::from_str(&list_calculators(Some("xx-not-real".into()))).unwrap();
        assert!(list.iter().all(|c| c["content_locale"] == "en"));
    }
}
