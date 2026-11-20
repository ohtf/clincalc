// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! International Prognostic Index (IPI) for aggressive non-Hodgkin lymphoma.
//!
//! One point each, assessed before treatment, for age over 60 years, Ann Arbor
//! stage III or IV, more than one extranodal disease site, ECOG performance
//! status 2 or more, and serum LDH above the upper limit of normal. The total
//! (0-5) maps to the original four risk groups: 0-1 low, 2 low-intermediate,
//! 3 high-intermediate, 4-5 high. The published five-year survival figures come
//! from the 1982-1987 doxorubicin-era training sample, before rituximab, so
//! they are reported as historical cohort figures, not a personal prognosis.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

/// Machine name.
pub const NAME: &str = "ipi";

/// Primary publication.
pub const REFERENCE: &str = "The International Non-Hodgkin's Lymphoma Prognostic Factors Project. A predictive model for aggressive non-Hodgkin's lymphoma. N Engl J Med. 1993;329(14):987-994. doi:10.1056/NEJM199309303291402. PMID:8141877.";

/// Distribution licence: independently implemented from the published method.
pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Published clinical prognostic index - independently implemented from the primary literature",
    "https://doi.org/10.1056/NEJM199309303291402",
);

/// Inputs for the International Prognostic Index.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct IpiInput {
    /// Confirm an established aggressive non-Hodgkin lymphoma diagnosis, assessed before treatment.
    pub aggressive_nhl_before_treatment_confirmed: bool,
    /// Age in whole years at diagnosis.
    pub age_years: u8,
    /// Ann Arbor stage, 1 to 4.
    pub ann_arbor_stage: u8,
    /// Number of extranodal disease sites.
    pub extranodal_sites: u8,
    /// ECOG performance status, 0 to 4.
    pub ecog_performance_status: u8,
    /// Serum LDH above the local upper limit of normal.
    pub ldh_above_upper_limit_of_normal: bool,
}

/// IPI risk group from the original publication.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IpiRiskGroup {
    Low,
    LowIntermediate,
    HighIntermediate,
    High,
}

impl IpiRiskGroup {
    fn slug(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::LowIntermediate => "low_intermediate",
            Self::HighIntermediate => "high_intermediate",
            Self::High => "high",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Low => "low risk",
            Self::LowIntermediate => "low-intermediate risk",
            Self::HighIntermediate => "high-intermediate risk",
            Self::High => "high risk",
        }
    }

    /// Predicted five-year overall survival (%) in the all-ages training sample.
    fn published_five_year_survival_percent(self) -> u8 {
        match self {
            Self::Low => 73,
            Self::LowIntermediate => 51,
            Self::HighIntermediate => 43,
            Self::High => 26,
        }
    }
}

/// Typed IPI outcome.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IpiOutcome {
    pub score: u8,
    pub age_over_60: bool,
    pub stage_iii_or_iv: bool,
    pub more_than_one_extranodal_site: bool,
    pub performance_status_2_or_more: bool,
    pub ldh_above_upper_limit_of_normal: bool,
    pub risk_group: IpiRiskGroup,
    pub interpretation: String,
}

/// Calculate the IPI from pre-treatment factors.
pub fn compute(input: &IpiInput) -> Result<IpiOutcome, CalcError> {
    if !input.aggressive_nhl_before_treatment_confirmed {
        return Err(CalcError::InvalidInput(
            "the IPI applies to established aggressive non-Hodgkin lymphoma assessed before treatment; it is not a diagnostic test".into(),
        ));
    }
    if !(18..=120).contains(&input.age_years) {
        return Err(CalcError::InvalidInput(
            "age_years must be between 18 and 120; the IPI was derived in adults".into(),
        ));
    }
    if !(1..=4).contains(&input.ann_arbor_stage) {
        return Err(CalcError::InvalidInput(
            "ann_arbor_stage must be 1, 2, 3, or 4".into(),
        ));
    }
    if input.extranodal_sites > 50 {
        return Err(CalcError::InvalidInput(
            "extranodal_sites must be between 0 and 50".into(),
        ));
    }
    if input.ecog_performance_status > 4 {
        return Err(CalcError::InvalidInput(
            "ecog_performance_status must be 0, 1, 2, 3, or 4".into(),
        ));
    }

    let age_over_60 = input.age_years > 60;
    let stage_iii_or_iv = input.ann_arbor_stage >= 3;
    let more_than_one_extranodal_site = input.extranodal_sites > 1;
    let performance_status_2_or_more = input.ecog_performance_status >= 2;
    let ldh_above_upper_limit_of_normal = input.ldh_above_upper_limit_of_normal;

    let score = [
        age_over_60,
        stage_iii_or_iv,
        more_than_one_extranodal_site,
        performance_status_2_or_more,
        ldh_above_upper_limit_of_normal,
    ]
    .into_iter()
    .filter(|factor| *factor)
    .count() as u8;

    let risk_group = match score {
        0 | 1 => IpiRiskGroup::Low,
        2 => IpiRiskGroup::LowIntermediate,
        3 => IpiRiskGroup::HighIntermediate,
        _ => IpiRiskGroup::High,
    };

    let interpretation = format!(
        "IPI {score} of 5: {}. In the 1993 derivation (adults treated 1982-1987 with doxorubicin-containing chemotherapy, before rituximab), predicted five-year overall survival for this group was {}%. This is a historical cohort figure, not a personal prognosis; outcomes with modern immunochemotherapy are better, and R-IPI or NCCN-IPI may be preferred for patients treated with rituximab. The age-adjusted IPI for patients aged 60 or younger is not calculated here. The index does not determine treatment.",
        risk_group.label(),
        risk_group.published_five_year_survival_percent(),
    );

    Ok(IpiOutcome {
        score,
        age_over_60,
        stage_iii_or_iv,
        more_than_one_extranodal_site,
        performance_status_2_or_more,
        ldh_above_upper_limit_of_normal,
        risk_group,
        interpretation,
    })
}

/// Build the dispatchable [`CalculationResponse`] from typed inputs.
pub fn build_response(input: &IpiInput) -> Result<CalculationResponse, CalcError> {
    let outcome = compute(input)?;
    let mut working = Map::new();
    working.insert(
        "aggressive_nhl_before_treatment_confirmed".into(),
        json!(input.aggressive_nhl_before_treatment_confirmed),
    );
    working.insert("age_years".into(), json!(input.age_years));
    working.insert("age_over_60".into(), json!(outcome.age_over_60));
    working.insert("ann_arbor_stage".into(), json!(input.ann_arbor_stage));
    working.insert("stage_iii_or_iv".into(), json!(outcome.stage_iii_or_iv));
    working.insert("extranodal_sites".into(), json!(input.extranodal_sites));
    working.insert(
        "more_than_one_extranodal_site".into(),
        json!(outcome.more_than_one_extranodal_site),
    );
    working.insert(
        "ecog_performance_status".into(),
        json!(input.ecog_performance_status),
    );
    working.insert(
        "performance_status_2_or_more".into(),
        json!(outcome.performance_status_2_or_more),
    );
    working.insert(
        "ldh_above_upper_limit_of_normal".into(),
        json!(outcome.ldh_above_upper_limit_of_normal),
    );
    working.insert("risk_group".into(), json!(outcome.risk_group.slug()));
    working.insert(
        "published_five_year_overall_survival_percent".into(),
        json!(outcome.risk_group.published_five_year_survival_percent()),
    );
    working.insert(
        "published_survival_population".into(),
        json!("All-ages training sample, NEJM 1993 (n=2031), treated 1982-1987 before rituximab"),
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(outcome.score),
        interpretation: outcome.interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

fn input_schema() -> Value {
    let source = json!({
        "citation": "International Non-Hodgkin's Lymphoma Prognostic Factors Project. N Engl J Med. 1993;329(14):987-994.",
        "url": "https://doi.org/10.1056/NEJM199309303291402"
    });

    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "IpiInput",
        "type": "object",
        "additionalProperties": false,
        "required": [
            "aggressive_nhl_before_treatment_confirmed",
            "age_years",
            "ann_arbor_stage",
            "extranodal_sites",
            "ecog_performance_status",
            "ldh_above_upper_limit_of_normal"
        ],
        "properties": {
            "aggressive_nhl_before_treatment_confirmed": {
                "type": "boolean",
                "const": true,
                "description": "Confirm an established aggressive (intermediate- or high-grade) non-Hodgkin lymphoma, with all factors assessed before treatment",
                "definition": {
                    "concept": "Established aggressive non-Hodgkin lymphoma before treatment",
                    "statement": "Use the IPI only for an established aggressive non-Hodgkin lymphoma, with factors recorded at diagnosis before treatment starts.",
                    "excludes": ["Suspected lymphoma not yet diagnosed", "Indolent lymphomas, which have their own indices", "Factors recorded after treatment has started"],
                    "caveats": "This input confirms applicability but does not contribute to the score.",
                    "source": source,
                    "status": "draft"
                }
            },
            "age_years": {
                "type": "integer",
                "minimum": 18,
                "maximum": 120,
                "unit": "years",
                "description": "Age in whole years at diagnosis; scores 1 point when over 60",
                "definition": {
                    "concept": "Age at diagnosis",
                    "statement": "Age in completed years at diagnosis. The index codes age as 60 or younger versus more than 60.",
                    "caveats": "Age 60 exactly scores 0.",
                    "source": source,
                    "status": "draft"
                }
            },
            "ann_arbor_stage": {
                "type": "integer",
                "minimum": 1,
                "maximum": 4,
                "description": "Ann Arbor stage 1-4; scores 1 point for stage III or IV",
                "definition": {
                    "concept": "Ann Arbor stage",
                    "statement": "The Ann Arbor stage at diagnosis, entered as 1 to 4. Stage III or IV (advanced disease) scores 1 point.",
                    "caveats": "Enter the stage number only; A/B symptom and bulk suffixes do not affect the IPI.",
                    "source": source,
                    "status": "draft"
                }
            },
            "extranodal_sites": {
                "type": "integer",
                "minimum": 0,
                "maximum": 50,
                "description": "Number of extranodal disease sites; scores 1 point when more than 1",
                "definition": {
                    "concept": "Extranodal disease sites",
                    "statement": "The number of extranodal sites involved by lymphoma at diagnosis. More than one site scores 1 point.",
                    "caveats": "One extranodal site scores 0.",
                    "source": source,
                    "status": "draft"
                }
            },
            "ecog_performance_status": {
                "type": "integer",
                "minimum": 0,
                "maximum": 4,
                "description": "ECOG performance status 0-4; scores 1 point when 2 or more",
                "definition": {
                    "concept": "ECOG performance status",
                    "statement": "The Eastern Cooperative Oncology Group performance status at diagnosis. A status of 2 or more (ambulatory but unable to work, or worse) scores 1 point.",
                    "caveats": "Status 5 (dead) is not a valid input.",
                    "source": source,
                    "status": "draft"
                }
            },
            "ldh_above_upper_limit_of_normal": {
                "type": "boolean",
                "description": "Serum lactate dehydrogenase above the local laboratory's upper limit of normal; scores 1 point",
                "definition": {
                    "concept": "Raised serum LDH",
                    "statement": "Serum LDH at diagnosis is more than 1 times the local laboratory's upper limit of normal.",
                    "caveats": "A value equal to the upper limit of normal is not raised. Use the reporting laboratory's own reference range.",
                    "source": source,
                    "status": "draft"
                }
            }
        }
    })
}

/// Dynamic calculator implementation.
pub struct Ipi;

impl Calculator for Ipi {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "International Prognostic Index (IPI) for Aggressive Non-Hodgkin Lymphoma"
    }

    fn description(&self) -> &'static str {
        "Scores five pre-treatment factors (0-5) in established aggressive non-Hodgkin lymphoma and reports the original four risk groups with historical pre-rituximab five-year survival. It does not determine treatment."
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
        let parsed: IpiInput = serde_json::from_value(input.clone())
            .map_err(|error| CalcError::InvalidInput(error.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::locale::SupportedLocale;

    fn input(age: u8, stage: u8, extranodal: u8, ecog: u8, ldh: bool) -> IpiInput {
        IpiInput {
            aggressive_nhl_before_treatment_confirmed: true,
            age_years: age,
            ann_arbor_stage: stage,
            extranodal_sites: extranodal,
            ecog_performance_status: ecog,
            ldh_above_upper_limit_of_normal: ldh,
        }
    }

    #[test]
    fn each_factor_scores_one_point_at_its_published_cut_point() {
        // NEJM 1993: age >60, stage III/IV, extranodal >1, PS >=2, LDH >1x normal.
        assert_eq!(compute(&input(60, 2, 1, 1, false)).unwrap().score, 0);
        assert_eq!(compute(&input(61, 2, 1, 1, false)).unwrap().score, 1);
        assert_eq!(compute(&input(60, 3, 1, 1, false)).unwrap().score, 1);
        assert_eq!(compute(&input(60, 2, 2, 1, false)).unwrap().score, 1);
        assert_eq!(compute(&input(60, 2, 1, 2, false)).unwrap().score, 1);
        assert_eq!(compute(&input(60, 2, 1, 1, true)).unwrap().score, 1);
        assert_eq!(compute(&input(75, 4, 3, 3, true)).unwrap().score, 5);
    }

    #[test]
    fn risk_groups_and_published_survival_match_the_paper() {
        // 0 or 1 low; 2 low-intermediate; 3 high-intermediate; 4 or 5 high.
        // Five-year survival 73%, 51%, 43%, 26% (all-ages model).
        for (case, group, survival) in [
            (input(40, 1, 0, 0, false), IpiRiskGroup::Low, 73),
            (input(70, 1, 0, 0, false), IpiRiskGroup::Low, 73),
            (input(70, 3, 0, 0, false), IpiRiskGroup::LowIntermediate, 51),
            (
                input(70, 3, 2, 0, false),
                IpiRiskGroup::HighIntermediate,
                43,
            ),
            (input(70, 3, 2, 2, false), IpiRiskGroup::High, 26),
            (input(70, 3, 2, 2, true), IpiRiskGroup::High, 26),
        ] {
            let outcome = compute(&case).unwrap();
            assert_eq!(outcome.risk_group, group);
            assert_eq!(group.published_five_year_survival_percent(), survival);
        }
    }

    #[test]
    fn rejects_unconfirmed_applicability_and_out_of_range_values() {
        let mut unconfirmed = input(50, 2, 0, 0, false);
        unconfirmed.aggressive_nhl_before_treatment_confirmed = false;
        assert!(compute(&unconfirmed).is_err());
        assert!(compute(&input(17, 2, 0, 0, false)).is_err());
        assert!(compute(&input(121, 2, 0, 0, false)).is_err());
        assert!(compute(&input(50, 0, 0, 0, false)).is_err());
        assert!(compute(&input(50, 5, 0, 0, false)).is_err());
        assert!(compute(&input(50, 2, 51, 0, false)).is_err());
        assert!(compute(&input(50, 2, 0, 5, false)).is_err());
    }

    #[test]
    fn response_reports_score_factors_and_historical_caveat() {
        let response = build_response(&input(70, 3, 2, 0, false)).unwrap();
        assert_eq!(response.result, json!(3));
        assert_eq!(response.working["risk_group"], json!("high_intermediate"));
        assert_eq!(response.working["age_over_60"], json!(true));
        assert_eq!(response.working["stage_iii_or_iv"], json!(true));
        assert_eq!(
            response.working["more_than_one_extranodal_site"],
            json!(true)
        );
        assert_eq!(
            response.working["performance_status_2_or_more"],
            json!(false)
        );
        assert_eq!(
            response.working["published_five_year_overall_survival_percent"],
            json!(43)
        );
        assert!(response.interpretation.contains("before rituximab"));
        assert!(response.interpretation.contains("not a personal prognosis"));
    }

    #[test]
    fn dynamic_calculation_matches_typed_and_rejects_invalid_objects() {
        let typed_input = input(70, 3, 2, 0, false);
        let dynamic = Ipi
            .calculate(&serde_json::to_value(typed_input).unwrap())
            .unwrap();
        assert_eq!(dynamic, build_response(&typed_input).unwrap());

        let mut unknown = serde_json::to_value(typed_input).unwrap();
        unknown["b_symptoms"] = json!(true);
        assert!(Ipi.calculate(&unknown).is_err());

        let mut fractional = serde_json::to_value(typed_input).unwrap();
        fractional["ann_arbor_stage"] = json!(2.5);
        assert!(Ipi.calculate(&fractional).is_err());
    }

    #[test]
    fn schema_is_closed_and_complete() {
        let schema = Ipi.input_schema();
        assert_eq!(schema["additionalProperties"], json!(false));
        assert_eq!(schema["required"].as_array().unwrap().len(), 6);
        assert_eq!(
            schema["properties"]["aggressive_nhl_before_treatment_confirmed"]["const"],
            json!(true)
        );
        for property in schema["required"].as_array().unwrap() {
            let name = property.as_str().unwrap();
            assert!(
                schema["properties"][name]["definition"]["source"]["url"]
                    .as_str()
                    .unwrap()
                    .starts_with("https://"),
                "{name} lacks a sourced definition"
            );
        }
    }

    #[test]
    fn calculate_for_records_english_content_locale() {
        let response = Ipi
            .calculate_for(
                &serde_json::to_value(input(50, 2, 0, 0, false)).unwrap(),
                SupportedLocale::En,
            )
            .unwrap();
        assert_eq!(response.working["content_locale"], json!("en"));
    }
}
