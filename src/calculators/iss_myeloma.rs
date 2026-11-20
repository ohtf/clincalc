// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! International Staging System (ISS) for multiple myeloma.
//!
//! Stage I: serum beta2-microglobulin below 3.5 mg/L and serum albumin at
//! least 3.5 g/dL (35 g/L). Stage III: beta2-microglobulin at least 5.5 mg/L,
//! whatever the albumin. Stage II: neither. Derived in previously untreated
//! symptomatic myeloma. Not to be confused with the Injury Severity Score.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

/// Machine name.
pub const NAME: &str = "iss_myeloma";

/// Primary publication.
pub const REFERENCE: &str = "Greipp PR, San Miguel J, Durie BGM, et al. International staging system for multiple myeloma. J Clin Oncol. 2005;23(15):3412-3420. doi:10.1200/JCO.2005.04.242. PMID:15809451.";

/// Distribution licence: independently implemented from the published method.
pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Published clinical staging method - independently implemented from the primary literature",
    "https://doi.org/10.1200/JCO.2005.04.242",
);

/// Stage I upper bound (exclusive) and stage III lower bound (inclusive) for beta2-microglobulin, mg/L.
pub const B2M_STAGE_I_BELOW_MG_L: f64 = 3.5;
pub const B2M_STAGE_III_FROM_MG_L: f64 = 5.5;
/// Stage I albumin lower bound (inclusive), g/L (3.5 g/dL).
pub const ALBUMIN_STAGE_I_FROM_G_L: f64 = 35.0;

/// Inputs for ISS staging.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct IssInput {
    /// Confirm previously untreated symptomatic multiple myeloma.
    pub untreated_symptomatic_myeloma_confirmed: bool,
    /// Serum beta2-microglobulin, mg/L.
    pub beta2_microglobulin_mg_l: f64,
    /// Serum albumin, g/L.
    pub albumin_g_l: f64,
}

/// ISS stage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IssStage {
    I,
    II,
    III,
}

impl IssStage {
    pub fn numeral(self) -> &'static str {
        match self {
            Self::I => "I",
            Self::II => "II",
            Self::III => "III",
        }
    }

    /// Median overall survival in months, Greipp 2005.
    fn published_median_survival_months(self) -> u8 {
        match self {
            Self::I => 62,
            Self::II => 44,
            Self::III => 29,
        }
    }
}

/// Validate the two laboratory values shared with R-ISS.
pub fn validate_labs(beta2_microglobulin_mg_l: f64, albumin_g_l: f64) -> Result<(), CalcError> {
    if !beta2_microglobulin_mg_l.is_finite()
        || beta2_microglobulin_mg_l <= 0.0
        || beta2_microglobulin_mg_l > 200.0
    {
        return Err(CalcError::InvalidInput(
            "beta2_microglobulin_mg_l must be finite, greater than 0, and no greater than 200 mg/L"
                .into(),
        ));
    }
    if !albumin_g_l.is_finite() || albumin_g_l <= 0.0 || albumin_g_l > 80.0 {
        return Err(CalcError::InvalidInput(
            "albumin_g_l must be finite, greater than 0, and no greater than 80 g/L".into(),
        ));
    }
    Ok(())
}

/// The ISS stage rule, shared with R-ISS. Inputs must already be validated.
pub fn stage_from_labs(beta2_microglobulin_mg_l: f64, albumin_g_l: f64) -> IssStage {
    if beta2_microglobulin_mg_l >= B2M_STAGE_III_FROM_MG_L {
        IssStage::III
    } else if beta2_microglobulin_mg_l < B2M_STAGE_I_BELOW_MG_L
        && albumin_g_l >= ALBUMIN_STAGE_I_FROM_G_L
    {
        IssStage::I
    } else {
        IssStage::II
    }
}

/// Typed ISS outcome.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IssOutcome {
    pub stage: IssStage,
    pub interpretation: String,
}

/// Calculate the ISS stage.
pub fn compute(input: &IssInput) -> Result<IssOutcome, CalcError> {
    if !input.untreated_symptomatic_myeloma_confirmed {
        return Err(CalcError::InvalidInput(
            "ISS staging applies to previously untreated symptomatic multiple myeloma; it is not a diagnostic test".into(),
        ));
    }
    validate_labs(input.beta2_microglobulin_mg_l, input.albumin_g_l)?;
    let stage = stage_from_labs(input.beta2_microglobulin_mg_l, input.albumin_g_l);
    let interpretation = format!(
        "ISS stage {}. In the 2005 analysis of 10,750 previously untreated patients, median overall survival for this stage was {} months. This is a historical cohort figure, not a personal prognosis. ISS reflects tumour burden and renal function, not disease biology; the Revised ISS (R-ISS) adds cytogenetics and LDH. It does not determine treatment.",
        stage.numeral(),
        stage.published_median_survival_months(),
    );
    Ok(IssOutcome {
        stage,
        interpretation,
    })
}

/// Build the dispatchable [`CalculationResponse`] from typed inputs.
pub fn build_response(input: &IssInput) -> Result<CalculationResponse, CalcError> {
    let outcome = compute(input)?;
    let mut working = Map::new();
    working.insert(
        "untreated_symptomatic_myeloma_confirmed".into(),
        json!(input.untreated_symptomatic_myeloma_confirmed),
    );
    working.insert(
        "beta2_microglobulin_mg_l".into(),
        json!(input.beta2_microglobulin_mg_l),
    );
    working.insert("beta2_microglobulin_unit".into(), json!("mg/L"));
    working.insert("albumin_g_l".into(), json!(input.albumin_g_l));
    working.insert("albumin_unit".into(), json!("g/L"));
    working.insert("stage".into(), json!(outcome.stage.numeral()));
    working.insert(
        "published_median_overall_survival_months".into(),
        json!(outcome.stage.published_median_survival_months()),
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(outcome.stage.numeral()),
        interpretation: outcome.interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

/// Schema properties for the two laboratory inputs, shared with R-ISS.
pub fn lab_properties(source: &Value) -> (Value, Value) {
    (
        json!({
            "type": "number",
            "exclusiveMinimum": 0,
            "maximum": 200,
            "unit": "mg/L",
            "description": "Serum beta2-microglobulin in mg/L; below 3.5 (with albumin at least 35 g/L) is stage I, and 5.5 or more is stage III",
            "definition": {
                "concept": "Serum beta2-microglobulin",
                "statement": "Serum beta2-microglobulin at diagnosis, before treatment. A value of 5.5 mg/L or more is ISS stage III whatever the albumin.",
                "caveats": "Beta2-microglobulin rises with impaired renal function, which the ISS deliberately captures. The accepted range is broad analytic plausibility, not a staging interval.",
                "source": source,
                "status": "draft"
            }
        }),
        json!({
            "type": "number",
            "exclusiveMinimum": 0,
            "maximum": 80,
            "unit": "g/L",
            "description": "Serum albumin in g/L; at least 35 g/L (3.5 g/dL) is needed for stage I",
            "definition": {
                "concept": "Serum albumin",
                "statement": "Serum albumin at diagnosis, before treatment, in g/L. The published threshold of 3.5 g/dL equals 35 g/L.",
                "caveats": "Convert g/dL to g/L by multiplying by 10. The accepted range is broad analytic plausibility, not a staging interval.",
                "source": source,
                "status": "draft"
            }
        }),
    )
}

fn input_schema() -> Value {
    let source = json!({
        "citation": "Greipp PR, et al. J Clin Oncol. 2005;23(15):3412-3420.",
        "url": "https://doi.org/10.1200/JCO.2005.04.242"
    });
    let (b2m, albumin) = lab_properties(&source);

    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "IssInput",
        "type": "object",
        "additionalProperties": false,
        "required": [
            "untreated_symptomatic_myeloma_confirmed",
            "beta2_microglobulin_mg_l",
            "albumin_g_l"
        ],
        "properties": {
            "untreated_symptomatic_myeloma_confirmed": {
                "type": "boolean",
                "const": true,
                "description": "Confirm previously untreated symptomatic multiple myeloma; ISS is a staging system, not a diagnostic test",
                "definition": {
                    "concept": "Previously untreated symptomatic multiple myeloma",
                    "statement": "Use ISS only for established, previously untreated symptomatic multiple myeloma, with laboratory values from diagnosis.",
                    "excludes": ["Monoclonal gammopathy of undetermined significance (MGUS)", "Smouldering myeloma", "Relapsed or previously treated myeloma"],
                    "caveats": "This input confirms applicability but does not contribute to the stage.",
                    "source": source,
                    "status": "draft"
                }
            },
            "beta2_microglobulin_mg_l": b2m,
            "albumin_g_l": albumin
        }
    })
}

/// Dynamic calculator implementation.
pub struct IssMyeloma;

impl Calculator for IssMyeloma {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "International Staging System (ISS) for Multiple Myeloma"
    }

    fn description(&self) -> &'static str {
        "Stages previously untreated symptomatic multiple myeloma as I, II, or III from serum beta2-microglobulin and albumin, with historical median survival. Not the Injury Severity Score; it does not determine treatment."
    }

    fn reference(&self) -> &'static str {
        REFERENCE
    }

    fn license(&self) -> CalculatorLicense {
        LICENSE
    }

    fn input_schema(&self) -> Value {
        input_schema()
    }

    fn calculate(&self, input: &Value) -> Result<CalculationResponse, CalcError> {
        let parsed: IssInput = serde_json::from_value(input.clone())
            .map_err(|error| CalcError::InvalidInput(error.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::locale::SupportedLocale;

    fn input(b2m: f64, albumin: f64) -> IssInput {
        IssInput {
            untreated_symptomatic_myeloma_confirmed: true,
            beta2_microglobulin_mg_l: b2m,
            albumin_g_l: albumin,
        }
    }

    #[test]
    fn exact_stage_boundaries_from_greipp_2005() {
        // Stage I: B2M < 3.5 mg/L and albumin >= 3.5 g/dL (35 g/L).
        // Stage III: B2M >= 5.5 mg/L. Stage II: neither.
        for (b2m, albumin, expected) in [
            (2.0, 40.0, IssStage::I),
            (3.499, 35.0, IssStage::I),
            (3.5, 40.0, IssStage::II),
            (2.0, 34.999, IssStage::II),
            (5.499, 20.0, IssStage::II),
            (5.5, 45.0, IssStage::III),
            (12.0, 30.0, IssStage::III),
        ] {
            assert_eq!(compute(&input(b2m, albumin)).unwrap().stage, expected);
        }
    }

    #[test]
    fn published_median_survival_by_stage() {
        assert_eq!(IssStage::I.published_median_survival_months(), 62);
        assert_eq!(IssStage::II.published_median_survival_months(), 44);
        assert_eq!(IssStage::III.published_median_survival_months(), 29);
    }

    #[test]
    fn rejects_unconfirmed_applicability_and_implausible_values() {
        let mut unconfirmed = input(2.0, 40.0);
        unconfirmed.untreated_symptomatic_myeloma_confirmed = false;
        assert!(compute(&unconfirmed).is_err());
        for b2m in [f64::NAN, f64::INFINITY, 0.0, -1.0, 200.001] {
            assert!(compute(&input(b2m, 40.0)).is_err());
        }
        for albumin in [f64::NAN, f64::NEG_INFINITY, 0.0, 80.001] {
            assert!(compute(&input(2.0, albumin)).is_err());
        }
    }

    #[test]
    fn response_reports_stage_units_and_caveats() {
        let response = build_response(&input(6.0, 30.0)).unwrap();
        assert_eq!(response.result, json!("III"));
        assert_eq!(response.working["beta2_microglobulin_unit"], json!("mg/L"));
        assert_eq!(response.working["albumin_unit"], json!("g/L"));
        assert_eq!(
            response.working["published_median_overall_survival_months"],
            json!(29)
        );
        assert!(response.interpretation.contains("not a personal prognosis"));
    }

    #[test]
    fn dynamic_calculation_matches_typed_and_rejects_invalid_objects() {
        let typed_input = input(4.0, 38.0);
        let dynamic = IssMyeloma
            .calculate(&serde_json::to_value(typed_input).unwrap())
            .unwrap();
        assert_eq!(dynamic, build_response(&typed_input).unwrap());

        let mut unknown = serde_json::to_value(typed_input).unwrap();
        unknown["albumin_g_dl"] = json!(3.8);
        assert!(IssMyeloma.calculate(&unknown).is_err());
    }

    #[test]
    fn schema_is_closed_and_states_units() {
        let schema = IssMyeloma.input_schema();
        assert_eq!(schema["additionalProperties"], json!(false));
        assert_eq!(schema["required"].as_array().unwrap().len(), 3);
        assert_eq!(
            schema["properties"]["beta2_microglobulin_mg_l"]["unit"],
            json!("mg/L")
        );
        assert_eq!(schema["properties"]["albumin_g_l"]["unit"], json!("g/L"));
    }

    #[test]
    fn calculate_for_records_english_content_locale() {
        let response = IssMyeloma
            .calculate_for(
                &serde_json::to_value(input(2.0, 40.0)).unwrap(),
                SupportedLocale::En,
            )
            .unwrap();
        assert_eq!(response.working["content_locale"], json!("en"));
    }
}
