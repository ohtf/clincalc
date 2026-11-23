// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::calculator::CalcError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CreatinineUnit {
    UmolL,
    MmolL,
    MgDl,
}

impl CreatinineUnit {
    pub(super) const FACTORS: [(&'static str, f64); 3] = [
        ("umol_l", 1.0),
        ("mmol_l", 1000.0),
        ("mg_dl", 88.4), // Creatinine molecular mass: see BUN/creatinine ratio.
    ];

    pub(super) fn factor(self) -> f64 {
        Self::FACTORS[self as usize].1
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UreaUnit {
    MmolL,
    UreaMgDl,
    UreaNitrogenMgDl,
}

impl UreaUnit {
    pub(super) const FACTORS: [(&'static str, f64); 3] = [
        ("mmol_l", 1.0),
        ("urea_mg_dl", 1.0 / 6.006), // Urea molecular mass 60.06 g/mol.
        ("urea_nitrogen_mg_dl", 1.0 / 2.80), // Nitrogen mass per mmol of urea.
    ];

    pub(super) fn factor(self) -> f64 {
        Self::FACTORS[self as usize].1
    }
}

/// When both units are absent, the legacy caller is responsible for matching
/// them. If one is declared the other must not be inferred.
pub(super) fn align_pair(
    urine: f64,
    plasma: f64,
    urine_factor: Option<f64>,
    plasma_factor: Option<f64>,
    analyte: &str,
) -> Result<(f64, f64), CalcError> {
    match (urine_factor, plasma_factor) {
        (Some(u), Some(p)) if u == p => Ok((urine, plasma)),
        (Some(u), Some(p)) => Ok((urine * u, plasma * p)),
        (None, None) => Ok((urine, plasma)),
        _ => Err(CalcError::InvalidInput(format!(
            "Supply both urine and plasma {analyte} units, or omit both only if the reported units match"
        ))),
    }
}

pub(super) fn unit_schema(factors: &[(&str, f64)], description: &str) -> Value {
    json!({ "type": "string", "enum": factors.iter().map(|(unit, _)| *unit).collect::<Vec<_>>(), "description": description })
}
