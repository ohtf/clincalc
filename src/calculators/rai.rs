// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Rai staging for established chronic lymphocytic leukaemia (CLL), with the
//! iwCLL 2018 modified three-group risk classification.
//!
//! The highest applicable stage is assigned: stage IV, platelet count below
//! 100 x10^9/L; stage III, haemoglobin below 11 g/dL; stage II, enlarged spleen
//! and/or liver (lymph nodes palpable or not); stage I, enlarged lymph nodes;
//! stage 0, lymphocytosis only. Modified Rai groups: stage 0 low risk, I-II
//! intermediate risk, III-IV high risk. Lymphocytosis is implied by the
//! established CLL diagnosis, which this calculator requires rather than tests.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

/// Machine name.
pub const NAME: &str = "rai";

/// Original Rai method and modern iwCLL clinical operationalisation.
pub const REFERENCE: &str = "Rai KR, Sawitsky A, Cronkite EP, Chanana AD, Levy RN, Pasternack BS. Clinical staging of chronic lymphocytic leukemia. Blood. 1975;46(2):219-234. PMID:1139039. Hallek M, Cheson BD, Catovsky D, et al. iwCLL guidelines for diagnosis, indications for treatment, response assessment, and supportive management of CLL. Blood. 2018;131(25):2745-2760. doi:10.1182/blood-2017-09-806398.";

/// Distribution licence: independently implemented from the published method.
pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Published clinical method - independently implemented from the primary literature",
    "https://pubmed.ncbi.nlm.nih.gov/1139039/",
);

/// Inputs for Rai staging of established CLL.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RaiInput {
    /// Confirm that CLL has already been diagnosed.
    pub cll_diagnosis_confirmed: bool,
    /// Haemoglobin concentration in g/dL.
    pub haemoglobin_g_dl: f64,
    /// Platelet count in 10^9/L.
    pub platelet_count_10_9_l: f64,
    /// Enlarged lymph nodes in any site on physical examination.
    pub lymphadenopathy: bool,
    /// Enlarged spleen and/or liver on physical examination.
    pub splenomegaly_or_hepatomegaly: bool,
}

/// Rai stage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RaiStage {
    Zero,
    I,
    II,
    III,
    IV,
}

impl RaiStage {
    fn numeral(self) -> &'static str {
        match self {
            Self::Zero => "0",
            Self::I => "I",
            Self::II => "II",
            Self::III => "III",
            Self::IV => "IV",
        }
    }

    fn modified_risk_group(self) -> &'static str {
        match self {
            Self::Zero => "low",
            Self::I | Self::II => "intermediate",
            Self::III | Self::IV => "high",
        }
    }
}

/// Typed Rai staging outcome.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RaiOutcome {
    pub stage: RaiStage,
    pub haemoglobin_below_11_g_dl: bool,
    pub platelet_count_below_100_10_9_l: bool,
    pub interpretation: String,
}

/// Calculate the Rai stage.
pub fn compute(input: &RaiInput) -> Result<RaiOutcome, CalcError> {
    if !input.cll_diagnosis_confirmed {
        return Err(CalcError::InvalidInput(
            "Rai staging requires an established CLL diagnosis; do not use it to diagnose CLL or stage MBL or SLL"
                .into(),
        ));
    }
    if !input.haemoglobin_g_dl.is_finite()
        || input.haemoglobin_g_dl <= 0.0
        || input.haemoglobin_g_dl > 30.0
    {
        return Err(CalcError::InvalidInput(
            "haemoglobin_g_dl must be finite, greater than 0, and no greater than 30 g/dL".into(),
        ));
    }
    if !input.platelet_count_10_9_l.is_finite()
        || !(0.0..=2000.0).contains(&input.platelet_count_10_9_l)
    {
        return Err(CalcError::InvalidInput(
            "platelet_count_10_9_l must be finite and between 0 and 2000 x10^9/L inclusive".into(),
        ));
    }

    let haemoglobin_below_11_g_dl = input.haemoglobin_g_dl < 11.0;
    let platelet_count_below_100_10_9_l = input.platelet_count_10_9_l < 100.0;

    let stage = if platelet_count_below_100_10_9_l {
        RaiStage::IV
    } else if haemoglobin_below_11_g_dl {
        RaiStage::III
    } else if input.splenomegaly_or_hepatomegaly {
        RaiStage::II
    } else if input.lymphadenopathy {
        RaiStage::I
    } else {
        RaiStage::Zero
    };

    let interpretation = format!(
        "Rai stage {} (modified Rai {} risk). This is a historical prognostic stage, not a treatment instruction; iwCLL 2018 recommends treatment only for active disease. Rai staging does not distinguish disease-related cytopenias from autoimmune or other causes, so clinicians must attribute the cause of anaemia or thrombocytopenia. It omits molecular and other modern prognostic factors.",
        stage.numeral(),
        stage.modified_risk_group(),
    );

    Ok(RaiOutcome {
        stage,
        haemoglobin_below_11_g_dl,
        platelet_count_below_100_10_9_l,
        interpretation,
    })
}

/// Build the dispatchable [`CalculationResponse`] from typed inputs.
pub fn build_response(input: &RaiInput) -> Result<CalculationResponse, CalcError> {
    let outcome = compute(input)?;
    let mut working = Map::new();
    working.insert(
        "cll_diagnosis_confirmed".into(),
        json!(input.cll_diagnosis_confirmed),
    );
    working.insert("haemoglobin_g_dl".into(), json!(input.haemoglobin_g_dl));
    working.insert("haemoglobin_unit".into(), json!("g/dL"));
    working.insert(
        "platelet_count_10_9_l".into(),
        json!(input.platelet_count_10_9_l),
    );
    working.insert("platelet_count_unit".into(), json!("x10^9/L"));
    working.insert("lymphadenopathy".into(), json!(input.lymphadenopathy));
    working.insert(
        "splenomegaly_or_hepatomegaly".into(),
        json!(input.splenomegaly_or_hepatomegaly),
    );
    working.insert(
        "haemoglobin_below_11_g_dl".into(),
        json!(outcome.haemoglobin_below_11_g_dl),
    );
    working.insert(
        "platelet_count_below_100_10_9_l".into(),
        json!(outcome.platelet_count_below_100_10_9_l),
    );
    working.insert(
        "modified_rai_risk_group".into(),
        json!(outcome.stage.modified_risk_group()),
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
        "citation": "Hallek M, Cheson BD, Catovsky D, et al. Blood. 2018;131(25):2745-2760.",
        "url": "https://doi.org/10.1182/blood-2017-09-806398"
    });

    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "RaiInput",
        "type": "object",
        "additionalProperties": false,
        "required": [
            "cll_diagnosis_confirmed",
            "haemoglobin_g_dl",
            "platelet_count_10_9_l",
            "lymphadenopathy",
            "splenomegaly_or_hepatomegaly"
        ],
        "properties": {
            "cll_diagnosis_confirmed": {
                "type": "boolean",
                "const": true,
                "description": "Confirm that chronic lymphocytic leukaemia (CLL) is already diagnosed; Rai staging is not a diagnostic test",
                "definition": {
                    "concept": "Established CLL diagnosis",
                    "statement": "Use Rai staging only after CLL has been established by appropriate diagnostic criteria, which include the lymphocytosis that defines stage 0.",
                    "excludes": ["Diagnosis of suspected CLL", "Monoclonal B-cell lymphocytosis (MBL)", "Small lymphocytic lymphoma (SLL) without established CLL"],
                    "caveats": "This input confirms applicability but does not contribute to the stage.",
                    "source": source,
                    "status": "draft"
                }
            },
            "haemoglobin_g_dl": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 30,
                "unit": "g/dL",
                "description": "Haemoglobin concentration in g/dL; stage III threshold is strictly below 11 g/dL",
                "definition": {
                    "concept": "Haemoglobin concentration",
                    "statement": "Record the current haemoglobin concentration. A value below 11 g/dL meets the Rai stage III anaemia threshold.",
                    "caveats": "Convert g/L to g/dL by dividing by 10. Clinicians must attribute the cause of anaemia; iwCLL counts disease-related anaemia. The accepted range is broad analytic plausibility, not a staging interval.",
                    "source": source,
                    "status": "draft"
                }
            },
            "platelet_count_10_9_l": {
                "type": "number",
                "minimum": 0,
                "maximum": 2000,
                "unit": "x10^9/L",
                "description": "Platelet count in x10^9/L; stage IV threshold is strictly below 100 x10^9/L",
                "definition": {
                    "concept": "Platelet count",
                    "statement": "Record the current platelet count. A value below 100 x10^9/L meets the Rai stage IV thrombocytopenia threshold.",
                    "caveats": "Clinicians must attribute the cause of thrombocytopenia; immune thrombocytopenia is not distinguished by the stage. The accepted range is broad analytic plausibility, not a staging interval.",
                    "source": source,
                    "status": "draft"
                }
            },
            "lymphadenopathy": {
                "type": "boolean",
                "description": "Enlarged lymph nodes in any site on physical examination (stage I)",
                "definition": {
                    "concept": "Lymphadenopathy",
                    "statement": "Clinically enlarged lymph nodes are present in any site on physical examination.",
                    "excludes": ["CT-only lymphadenopathy"],
                    "caveats": "Stage II, III and IV apply whether or not nodes are enlarged.",
                    "source": source,
                    "status": "draft"
                }
            },
            "splenomegaly_or_hepatomegaly": {
                "type": "boolean",
                "description": "Enlarged spleen and/or liver on physical examination (stage II)",
                "definition": {
                    "concept": "Splenomegaly and/or hepatomegaly",
                    "statement": "The spleen and/or liver is clinically enlarged on physical examination.",
                    "excludes": ["Imaging-only organ enlargement", "A normally palpable liver edge without clinical enlargement"],
                    "caveats": "Stage II applies whether or not lymph nodes are enlarged.",
                    "source": source,
                    "status": "draft"
                }
            }
        }
    })
}

/// Dynamic calculator implementation.
pub struct Rai;

impl Calculator for Rai {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "Rai Stage for Chronic Lymphocytic Leukaemia"
    }

    fn description(&self) -> &'static str {
        "Assigns Rai stage 0-IV and the iwCLL 2018 modified low, intermediate, or high risk group for established CLL from physical examination, haemoglobin, and platelet count. It is not a treatment instruction."
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
        let parsed: RaiInput = serde_json::from_value(input.clone())
            .map_err(|error| CalcError::InvalidInput(error.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::locale::SupportedLocale;

    fn input(haemoglobin: f64, platelets: f64, nodes: bool, organs: bool) -> RaiInput {
        RaiInput {
            cll_diagnosis_confirmed: true,
            haemoglobin_g_dl: haemoglobin,
            platelet_count_10_9_l: platelets,
            lymphadenopathy: nodes,
            splenomegaly_or_hepatomegaly: organs,
        }
    }

    #[test]
    fn exact_stage_vectors_and_precedence() {
        for (case, stage, group) in [
            (input(14.0, 200.0, false, false), RaiStage::Zero, "low"),
            (input(14.0, 200.0, true, false), RaiStage::I, "intermediate"),
            (
                input(14.0, 200.0, false, true),
                RaiStage::II,
                "intermediate",
            ),
            (input(14.0, 200.0, true, true), RaiStage::II, "intermediate"),
            (input(11.0, 100.0, true, true), RaiStage::II, "intermediate"),
            (input(10.999, 100.0, false, false), RaiStage::III, "high"),
            (input(10.999, 100.0, true, true), RaiStage::III, "high"),
            (input(14.0, 99.999, false, false), RaiStage::IV, "high"),
            (input(9.0, 50.0, true, true), RaiStage::IV, "high"),
        ] {
            let outcome = compute(&case).unwrap();
            assert_eq!(outcome.stage, stage);
            assert_eq!(outcome.stage.modified_risk_group(), group);
        }
    }

    #[test]
    fn rejects_unconfirmed_diagnosis_nonfinite_and_out_of_range_values() {
        let mut unconfirmed = input(14.0, 200.0, false, false);
        unconfirmed.cll_diagnosis_confirmed = false;
        assert!(compute(&unconfirmed).is_err());
        for haemoglobin in [f64::NAN, f64::INFINITY, 0.0, -1.0, 30.001] {
            assert!(compute(&input(haemoglobin, 200.0, false, false)).is_err());
        }
        for platelets in [f64::NAN, f64::NEG_INFINITY, -0.001, 2000.001] {
            assert!(compute(&input(14.0, platelets, false, false)).is_err());
        }
    }

    #[test]
    fn response_contains_stage_group_and_caveats() {
        let response = build_response(&input(14.0, 200.0, true, false)).unwrap();
        assert_eq!(response.result, json!("I"));
        assert_eq!(
            response.working["modified_rai_risk_group"],
            json!("intermediate")
        );
        assert_eq!(response.working["haemoglobin_unit"], json!("g/dL"));
        assert!(
            response
                .interpretation
                .contains("not a treatment instruction")
        );
        assert!(!response.interpretation.contains("survival"));
    }

    #[test]
    fn dynamic_calculation_matches_typed_and_rejects_invalid_objects() {
        let typed_input = input(12.0, 150.0, true, true);
        let dynamic = Rai
            .calculate(&serde_json::to_value(typed_input).unwrap())
            .unwrap();
        assert_eq!(dynamic, build_response(&typed_input).unwrap());

        let mut unknown = serde_json::to_value(typed_input).unwrap();
        unknown["ct_only_nodes"] = json!(true);
        assert!(Rai.calculate(&unknown).is_err());
    }

    #[test]
    fn schema_is_closed_and_complete() {
        let schema = Rai.input_schema();
        assert_eq!(schema["additionalProperties"], json!(false));
        assert_eq!(schema["required"].as_array().unwrap().len(), 5);
        assert_eq!(
            schema["properties"]["cll_diagnosis_confirmed"]["const"],
            json!(true)
        );
    }

    #[test]
    fn calculate_for_records_english_content_locale() {
        let response = Rai
            .calculate_for(
                &serde_json::to_value(input(14.0, 200.0, false, false)).unwrap(),
                SupportedLocale::En,
            )
            .unwrap();
        assert_eq!(response.working["content_locale"], json!("en"));
    }
}
