// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Revised International Staging System (R-ISS) for newly diagnosed multiple
//! myeloma.
//!
//! R-ISS I: ISS stage I, no high-risk chromosomal abnormality by iFISH
//! [del(17p), t(4;14) or t(14;16)], and normal serum LDH. R-ISS III: ISS stage
//! III with either a high-risk abnormality or high LDH. R-ISS II: every other
//! combination. The ISS stage is derived with the shared rule in
//! [`crate::calculators::iss_myeloma`]. The R-ISS abstract states ISS stage III
//! as beta2-microglobulin "> 5.5 mg/L", but the paper's Table 1 and the
//! original ISS both use ">= 5.5 mg/L"; this implementation follows the tables.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::calculators::iss_myeloma::{self, IssStage};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

/// Machine name.
pub const NAME: &str = "r_iss_myeloma";

/// Primary publication, plus the ISS it builds on.
pub const REFERENCE: &str = "Palumbo A, Avet-Loiseau H, Oliva S, et al. Revised International Staging System for Multiple Myeloma: A Report From International Myeloma Working Group. J Clin Oncol. 2015;33(26):2863-2869. doi:10.1200/JCO.2015.61.2267. PMID:26240224. Greipp PR, San Miguel J, Durie BGM, et al. International staging system for multiple myeloma. J Clin Oncol. 2005;23(15):3412-3420. doi:10.1200/JCO.2005.04.242.";

/// Distribution licence: independently implemented from the published method.
pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Published clinical staging method - independently implemented from the primary literature",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC4846284/",
);

/// Inputs for R-ISS staging.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RIssInput {
    /// Confirm newly diagnosed multiple myeloma.
    pub newly_diagnosed_myeloma_confirmed: bool,
    /// Serum beta2-microglobulin, mg/L.
    pub beta2_microglobulin_mg_l: f64,
    /// Serum albumin, g/L.
    pub albumin_g_l: f64,
    /// Any of del(17p), t(4;14) or t(14;16) detected by iFISH.
    pub high_risk_chromosomal_abnormality: bool,
    /// Serum LDH above the local upper limit of normal.
    pub ldh_above_upper_limit_of_normal: bool,
}

/// R-ISS stage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RIssStage {
    I,
    II,
    III,
}

impl RIssStage {
    fn numeral(self) -> &'static str {
        match self {
            Self::I => "I",
            Self::II => "II",
            Self::III => "III",
        }
    }

    /// Five-year overall and progression-free survival (%), Palumbo 2015.
    fn published_five_year_os_and_pfs_percent(self) -> (u8, u8) {
        match self {
            Self::I => (82, 55),
            Self::II => (62, 36),
            Self::III => (40, 24),
        }
    }
}

/// Typed R-ISS outcome.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RIssOutcome {
    pub iss_stage: IssStage,
    pub stage: RIssStage,
    pub interpretation: String,
}

/// Calculate the R-ISS stage.
pub fn compute(input: &RIssInput) -> Result<RIssOutcome, CalcError> {
    if !input.newly_diagnosed_myeloma_confirmed {
        return Err(CalcError::InvalidInput(
            "R-ISS applies to newly diagnosed multiple myeloma; it is not a diagnostic test".into(),
        ));
    }
    iss_myeloma::validate_labs(input.beta2_microglobulin_mg_l, input.albumin_g_l)?;
    let iss_stage = iss_myeloma::stage_from_labs(input.beta2_microglobulin_mg_l, input.albumin_g_l);

    let stage = match iss_stage {
        IssStage::I
            if !input.high_risk_chromosomal_abnormality
                && !input.ldh_above_upper_limit_of_normal =>
        {
            RIssStage::I
        }
        IssStage::III
            if input.high_risk_chromosomal_abnormality || input.ldh_above_upper_limit_of_normal =>
        {
            RIssStage::III
        }
        _ => RIssStage::II,
    };

    let (os, pfs) = stage.published_five_year_os_and_pfs_percent();
    let interpretation = format!(
        "R-ISS stage {} (ISS stage {}). In the 2015 pooled analysis of 3,060 newly diagnosed patients from 11 trials, five-year overall survival for this stage was {os}% and progression-free survival {pfs}%. These are historical trial-cohort figures, not a personal prognosis. R-ISS does not determine treatment.",
        stage.numeral(),
        iss_stage.numeral(),
    );

    Ok(RIssOutcome {
        iss_stage,
        stage,
        interpretation,
    })
}

/// Build the dispatchable [`CalculationResponse`] from typed inputs.
pub fn build_response(input: &RIssInput) -> Result<CalculationResponse, CalcError> {
    let outcome = compute(input)?;
    let (os, pfs) = outcome.stage.published_five_year_os_and_pfs_percent();
    let mut working = Map::new();
    working.insert(
        "newly_diagnosed_myeloma_confirmed".into(),
        json!(input.newly_diagnosed_myeloma_confirmed),
    );
    working.insert(
        "beta2_microglobulin_mg_l".into(),
        json!(input.beta2_microglobulin_mg_l),
    );
    working.insert("beta2_microglobulin_unit".into(), json!("mg/L"));
    working.insert("albumin_g_l".into(), json!(input.albumin_g_l));
    working.insert("albumin_unit".into(), json!("g/L"));
    working.insert("iss_stage".into(), json!(outcome.iss_stage.numeral()));
    working.insert(
        "high_risk_chromosomal_abnormality".into(),
        json!(input.high_risk_chromosomal_abnormality),
    );
    working.insert(
        "ldh_above_upper_limit_of_normal".into(),
        json!(input.ldh_above_upper_limit_of_normal),
    );
    working.insert("stage".into(), json!(outcome.stage.numeral()));
    working.insert(
        "published_five_year_overall_survival_percent".into(),
        json!(os),
    );
    working.insert(
        "published_five_year_progression_free_survival_percent".into(),
        json!(pfs),
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(outcome.stage.numeral()),
        interpretation: outcome.interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

fn input_schema() -> Value {
    let source = json!({
        "citation": "Palumbo A, et al. J Clin Oncol. 2015;33(26):2863-2869.",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4846284/"
    });
    let (b2m, albumin) = iss_myeloma::lab_properties(&source);

    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "RIssInput",
        "type": "object",
        "additionalProperties": false,
        "required": [
            "newly_diagnosed_myeloma_confirmed",
            "beta2_microglobulin_mg_l",
            "albumin_g_l",
            "high_risk_chromosomal_abnormality",
            "ldh_above_upper_limit_of_normal"
        ],
        "properties": {
            "newly_diagnosed_myeloma_confirmed": {
                "type": "boolean",
                "const": true,
                "description": "Confirm newly diagnosed multiple myeloma; R-ISS is a staging system, not a diagnostic test",
                "definition": {
                    "concept": "Newly diagnosed multiple myeloma",
                    "statement": "Use R-ISS only for newly diagnosed multiple myeloma, with all values from diagnosis.",
                    "excludes": ["MGUS", "Smouldering myeloma", "Relapsed or previously treated myeloma"],
                    "caveats": "This input confirms applicability but does not contribute to the stage.",
                    "source": source,
                    "status": "draft"
                }
            },
            "beta2_microglobulin_mg_l": b2m,
            "albumin_g_l": albumin,
            "high_risk_chromosomal_abnormality": {
                "type": "boolean",
                "description": "Any of del(17p), t(4;14) or t(14;16) detected by interphase FISH on purified plasma cells",
                "definition": {
                    "concept": "High-risk chromosomal abnormality",
                    "statement": "At least one of del(17p), translocation t(4;14) or translocation t(14;16) is detected by interphase FISH, at or above the local laboratory's positivity cut-off.",
                    "excludes": ["Other abnormalities such as gain(1q) or del(13), which R-ISS does not count", "No FISH result available"],
                    "caveats": "R-ISS needs a FISH result; if cytogenetics are unavailable, use ISS instead of entering false.",
                    "source": source,
                    "status": "draft"
                }
            },
            "ldh_above_upper_limit_of_normal": {
                "type": "boolean",
                "description": "Serum LDH above the local laboratory's upper limit of normal",
                "definition": {
                    "concept": "Raised serum LDH",
                    "statement": "Serum LDH at diagnosis is greater than the local laboratory's upper limit of normal.",
                    "caveats": "The paper defines high LDH as above the upper limit of normal and normal LDH as below it; a value exactly at the limit is treated as not raised here.",
                    "source": source,
                    "status": "draft"
                }
            }
        }
    })
}

/// Dynamic calculator implementation.
pub struct RIssMyeloma;

impl Calculator for RIssMyeloma {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "Revised International Staging System (R-ISS) for Multiple Myeloma"
    }

    fn description(&self) -> &'static str {
        "Stages newly diagnosed multiple myeloma as R-ISS I, II, or III from ISS stage, high-risk FISH cytogenetics, and LDH, with historical five-year survival. It does not determine treatment."
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
        let parsed: RIssInput = serde_json::from_value(input.clone())
            .map_err(|error| CalcError::InvalidInput(error.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::locale::SupportedLocale;

    fn input(b2m: f64, albumin: f64, high_risk_ca: bool, high_ldh: bool) -> RIssInput {
        RIssInput {
            newly_diagnosed_myeloma_confirmed: true,
            beta2_microglobulin_mg_l: b2m,
            albumin_g_l: albumin,
            high_risk_chromosomal_abnormality: high_risk_ca,
            ldh_above_upper_limit_of_normal: high_ldh,
        }
    }

    #[test]
    fn stage_rules_from_palumbo_2015() {
        // I: ISS I + standard-risk CA + normal LDH.
        // III: ISS III + (high-risk CA or high LDH). II: everything else.
        for (case, iss, expected) in [
            (input(2.0, 40.0, false, false), IssStage::I, RIssStage::I),
            (input(2.0, 40.0, true, false), IssStage::I, RIssStage::II),
            (input(2.0, 40.0, false, true), IssStage::I, RIssStage::II),
            (input(4.0, 40.0, true, true), IssStage::II, RIssStage::II),
            (input(6.0, 30.0, false, false), IssStage::III, RIssStage::II),
            (input(6.0, 30.0, true, false), IssStage::III, RIssStage::III),
            (input(6.0, 30.0, false, true), IssStage::III, RIssStage::III),
            (input(5.5, 45.0, true, true), IssStage::III, RIssStage::III),
        ] {
            let outcome = compute(&case).unwrap();
            assert_eq!(outcome.iss_stage, iss);
            assert_eq!(outcome.stage, expected);
        }
    }

    #[test]
    fn published_five_year_survival_by_stage() {
        assert_eq!(
            RIssStage::I.published_five_year_os_and_pfs_percent(),
            (82, 55)
        );
        assert_eq!(
            RIssStage::II.published_five_year_os_and_pfs_percent(),
            (62, 36)
        );
        assert_eq!(
            RIssStage::III.published_five_year_os_and_pfs_percent(),
            (40, 24)
        );
    }

    #[test]
    fn rejects_unconfirmed_applicability_and_implausible_values() {
        let mut unconfirmed = input(2.0, 40.0, false, false);
        unconfirmed.newly_diagnosed_myeloma_confirmed = false;
        assert!(compute(&unconfirmed).is_err());
        assert!(compute(&input(f64::NAN, 40.0, false, false)).is_err());
        assert!(compute(&input(2.0, 0.0, false, false)).is_err());
    }

    #[test]
    fn response_reports_both_stages_and_survival() {
        let response = build_response(&input(6.0, 30.0, true, false)).unwrap();
        assert_eq!(response.result, json!("III"));
        assert_eq!(response.working["iss_stage"], json!("III"));
        assert_eq!(
            response.working["published_five_year_overall_survival_percent"],
            json!(40)
        );
        assert_eq!(
            response.working["published_five_year_progression_free_survival_percent"],
            json!(24)
        );
        assert!(response.interpretation.contains("not a personal prognosis"));
    }

    #[test]
    fn dynamic_calculation_matches_typed_and_rejects_invalid_objects() {
        let typed_input = input(4.0, 38.0, true, false);
        let dynamic = RIssMyeloma
            .calculate(&serde_json::to_value(typed_input).unwrap())
            .unwrap();
        assert_eq!(dynamic, build_response(&typed_input).unwrap());

        let mut unknown = serde_json::to_value(typed_input).unwrap();
        unknown["gain_1q"] = json!(true);
        assert!(RIssMyeloma.calculate(&unknown).is_err());
    }

    #[test]
    fn schema_is_closed_and_complete() {
        let schema = RIssMyeloma.input_schema();
        assert_eq!(schema["additionalProperties"], json!(false));
        assert_eq!(schema["required"].as_array().unwrap().len(), 5);
        assert!(
            schema["properties"]["high_risk_chromosomal_abnormality"]["definition"]["caveats"]
                .as_str()
                .unwrap()
                .contains("use ISS instead")
        );
    }

    #[test]
    fn calculate_for_records_english_content_locale() {
        let response = RIssMyeloma
            .calculate_for(
                &serde_json::to_value(input(2.0, 40.0, false, false)).unwrap(),
                SupportedLocale::En,
            )
            .unwrap();
        assert_eq!(response.working["content_locale"], json!("en"));
    }
}
