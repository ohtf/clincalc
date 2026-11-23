// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! FEUrea - Fractional Excretion of Urea.
//!
//! Formula: FEUrea (%) = (U_urea x P_Cr) / (P_urea x U_Cr) x 100
//!
//! Sodium-independent companion to the shipped `fena`, usable when a patient
//! is on diuretics (which raise urine sodium excretion and make FENa
//! unreliable) because loop and thiazide diuretics have much less effect on
//! urea handling.
//!
//! Interpretation (Carvounis et al 2002):
//! - FEUrea < 35%: pre-renal aetiology
//! - FEUrea >= 35% and < 50%: indeterminate
//! - FEUrea >= 50%: intrinsic renal failure (e.g. acute tubular necrosis)

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

pub use super::fractional_excretion::{CreatinineUnit, UreaUnit};
use super::fractional_excretion::{align_pair, unit_schema};
use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

pub const NAME: &str = "feurea";

pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Public-domain method - implemented from the primary literature",
    "https://doi.org/10.1046/j.1523-1755.2002.00683.x",
);

pub const REFERENCE: &str = "Carvounis CP, Nisar S, Guro-Razuman S. Significance of the fractional excretion of urea in the differential diagnosis of acute renal failure. Kidney Int. 2002;62(6):2223-2229. doi:10.1046/j.1523-1755.2002.00683.x";

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FeureaInput {
    /// Urine urea (any unit, same as plasma_urea)
    pub urine_urea: f64,
    /// Plasma urea (any unit, same as urine_urea)
    pub plasma_urea: f64,
    /// Urine creatinine (any unit, same as plasma_creatinine)
    pub urine_creatinine: f64,
    /// Plasma creatinine (any unit, same as urine_creatinine)
    pub plasma_creatinine: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub urine_creatinine_unit: Option<CreatinineUnit>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plasma_creatinine_unit: Option<CreatinineUnit>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub urine_urea_unit: Option<UreaUnit>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub plasma_urea_unit: Option<UreaUnit>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FeureaOutcome {
    pub feurea_percent: f64,
    pub category: &'static str,
    pub interpretation: String,
}

pub fn compute(input: &FeureaInput) -> Result<FeureaOutcome, CalcError> {
    for (name, value) in [
        ("urine_urea", input.urine_urea),
        ("plasma_urea", input.plasma_urea),
        ("urine_creatinine", input.urine_creatinine),
        ("plasma_creatinine", input.plasma_creatinine),
    ] {
        if value <= 0.0 || !value.is_finite() {
            return Err(CalcError::InvalidInput(format!(
                "{name} must be a finite positive number"
            )));
        }
    }

    let (urine_cr, plasma_cr) = align_pair(
        input.urine_creatinine,
        input.plasma_creatinine,
        input.urine_creatinine_unit.map(CreatinineUnit::factor),
        input.plasma_creatinine_unit.map(CreatinineUnit::factor),
        "creatinine",
    )?;
    let (urine_urea, plasma_urea) = align_pair(
        input.urine_urea,
        input.plasma_urea,
        input.urine_urea_unit.map(UreaUnit::factor),
        input.plasma_urea_unit.map(UreaUnit::factor),
        "urea",
    )?;
    let feurea = (urine_urea * plasma_cr) / (plasma_urea * urine_cr) * 100.0;
    if !feurea.is_finite() || feurea == 0.0 {
        return Err(CalcError::InvalidInput(
            "FEUrea is outside the calculable range; check the measurements and units".into(),
        ));
    }

    let (category, meaning) = if feurea > 100.0 {
        (
            "check_inputs",
            "above 100%; check the units and that samples are paired. No clinical classification is given",
        )
    } else if feurea < 35.0 {
        ("pre_renal", "consistent with pre-renal aetiology")
    } else if feurea < 50.0 {
        (
            "indeterminate",
            "indeterminate; clinical context and trend are required",
        )
    } else {
        (
            "intrinsic",
            "consistent with intrinsic renal failure (e.g. acute tubular necrosis)",
        )
    };

    let interpretation = format!(
        "FEUrea {feurea:.1}% - {meaning}. FEUrea is less affected by loop and thiazide diuretics than FENa; it can still be affected by severe volume depletion and some drugs."
    );

    Ok(FeureaOutcome {
        feurea_percent: feurea,
        category,
        interpretation,
    })
}

pub fn build_response(input: &FeureaInput) -> Result<CalculationResponse, CalcError> {
    let o = compute(input)?;
    let mut working = Map::new();
    working.insert("category".into(), json!(o.category));
    working.insert(
        "feurea_percent".into(),
        json!(format!("{:.1}", o.feurea_percent)),
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(format!("{:.1}", o.feurea_percent)),
        interpretation: o.interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

pub struct Feurea;

impl Calculator for Feurea {
    fn name(&self) -> &'static str {
        NAME
    }
    fn title(&self) -> &'static str {
        "FEUrea (Fractional Excretion of Urea)"
    }
    fn description(&self) -> &'static str {
        "Differentiates pre-renal from intrinsic renal failure using urine and plasma urea and creatinine; more reliable than FENa in diuretic-treated patients."
    }
    fn reference(&self) -> &'static str {
        REFERENCE
    }
    fn license(&self) -> CalculatorLicense {
        LICENSE
    }
    fn input_schema(&self) -> Value {
        json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "FeureaInput",
            "type": "object",
            "additionalProperties": false,
            "required": ["urine_urea", "plasma_urea", "urine_creatinine", "plasma_creatinine"],
            "dependentRequired": {
                "urine_creatinine_unit": ["plasma_creatinine_unit"],
                "plasma_creatinine_unit": ["urine_creatinine_unit"],
                "urine_urea_unit": ["plasma_urea_unit"],
                "plasma_urea_unit": ["urine_urea_unit"]
            },
            "properties": {
                "urine_creatinine_unit": unit_schema(&CreatinineUnit::FACTORS, "Unit as reported for urine creatinine. Omit both creatinine units only for a matched-unit pair."),
                "plasma_creatinine_unit": unit_schema(&CreatinineUnit::FACTORS, "Unit as reported for plasma creatinine. Omit both creatinine units only for a matched-unit pair."),
                "urine_urea_unit": unit_schema(&UreaUnit::FACTORS, "Unit as reported for urine urea or urine urea nitrogen. Omit both urea units only for a matched-unit pair."),
                "plasma_urea_unit": unit_schema(&UreaUnit::FACTORS, "Unit as reported for plasma urea or blood urea nitrogen. Omit both urea units only for a matched-unit pair."),
                "urine_urea": { "type": "number", "exclusiveMinimum": 0, "description": "Urine urea (any unit, must match plasma_urea unit)" },
                "plasma_urea": { "type": "number", "exclusiveMinimum": 0, "description": "Plasma/serum urea (same unit as urine_urea)" },
                "urine_creatinine": { "type": "number", "exclusiveMinimum": 0, "description": "Urine creatinine (any unit, must match plasma_creatinine unit)" },
                "plasma_creatinine": { "type": "number", "exclusiveMinimum": 0, "description": "Plasma/serum creatinine (same unit as urine_creatinine)" }
            }
        })
    }
    fn calculate(&self, input: &Value) -> Result<CalculationResponse, CalcError> {
        let parsed: FeureaInput = serde_json::from_value(input.clone())
            .map_err(|e| CalcError::InvalidInput(e.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inp(u_urea: f64, p_urea: f64, u_cr: f64, p_cr: f64) -> FeureaInput {
        FeureaInput {
            urine_urea: u_urea,
            plasma_urea: p_urea,
            urine_creatinine: u_cr,
            plasma_creatinine: p_cr,
            urine_creatinine_unit: None,
            plasma_creatinine_unit: None,
            urine_urea_unit: None,
            plasma_urea_unit: None,
        }
    }

    #[test]
    fn converts_creatinine_and_urea_nitrogen_independently() {
        let mut i = inp(100.0, 28.0, 10.0, 250.0);
        assert_eq!(compute(&i).unwrap().category, "check_inputs");
        i.urine_creatinine_unit = Some(CreatinineUnit::MmolL);
        i.plasma_creatinine_unit = Some(CreatinineUnit::UmolL);
        i.urine_urea_unit = Some(UreaUnit::MmolL);
        assert!(compute(&i).is_err());
        i.plasma_urea_unit = Some(UreaUnit::UreaNitrogenMgDl);
        assert!((compute(&i).unwrap().feurea_percent - 25.0).abs() < 1e-9);
    }

    #[test]
    fn prerenal_low_feurea() {
        // U_urea=300, P_urea=10, U_Cr=120, P_Cr=2.0 -> (300*2)/(10*120)*100 = 50%... adjust for a clearly low case
        let o = compute(&inp(150.0, 10.0, 120.0, 2.0)).unwrap();
        assert!(
            (o.feurea_percent - 25.0).abs() < 0.01,
            "got {}",
            o.feurea_percent
        );
        assert!(o.interpretation.contains("pre-renal"));
    }

    #[test]
    fn intrinsic_high_feurea() {
        let o = compute(&inp(240.0, 10.0, 60.0, 2.0)).unwrap();
        assert!(o.feurea_percent >= 50.0, "got {}", o.feurea_percent);
        assert!(o.interpretation.contains("intrinsic"));
    }

    #[test]
    fn rejects_zero_inputs() {
        assert!(compute(&inp(0.0, 10.0, 120.0, 2.0)).is_err());
        assert!(compute(&inp(150.0, 0.0, 120.0, 2.0)).is_err());
        assert!(compute(&inp(150.0, 10.0, 0.0, 2.0)).is_err());
        assert!(compute(&inp(150.0, 10.0, 120.0, 0.0)).is_err());
    }

    #[test]
    fn dynamic_calculate_matches_typed() {
        let value = json!({
            "urine_urea": 150.0, "plasma_urea": 10.0, "urine_creatinine": 120.0, "plasma_creatinine": 2.0
        });
        let dynamic = Feurea.calculate(&value).unwrap();
        let typed = build_response(&inp(150.0, 10.0, 120.0, 2.0)).unwrap();
        assert_eq!(dynamic, typed);
    }

    #[test]
    fn rejects_missing_required_field() {
        assert!(
            Feurea
                .calculate(&json!({"urine_urea": 150.0, "plasma_urea": 10.0}))
                .is_err()
        );
    }
}
