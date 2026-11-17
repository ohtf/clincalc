// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! DOTS - bodyweight-adjusted powerlifting score, alternative to Wilks.
//!
//! Scales a bench press or three-lift competition total by a sex-specific
//! quartic-polynomial function of bodyweight. "DOTS" (Dynamic Objective Team
//! Scoring) was devised by Tim Konertz for the German powerlifting federation
//! (BVDK) in 2019 and is now used alongside, or in place of, Wilks by several
//! federations including USA Powerlifting (USAPL) and USPA.
//!
//! `coefficient = 500 / (a*x^4 + b*x^3 + c*x^2 + d*x + e)`, where `x` is
//! bodyweight in kilograms. `score = coefficient * lifted_kg`.
//!
//! Unlike the shipped `wilks` calculator, DOTS has no single tabulated
//! lookup convention: USAPL and USPA both publish the coefficient as a
//! formula to be evaluated directly, not rounded to a fixed number of
//! decimal places before use, so this calculator computes the score from
//! the unrounded coefficient and reports a rounded coefficient only for
//! display.
//!
//! The published formula is valid from 40 kg; above the formula's upper
//! bound (210 kg for men, 150 kg for women) the coefficient for that bound
//! is used rather than extrapolating the polynomial, matching the published
//! convention.
//!
//! There is no single peer-reviewed academic paper describing DOTS, unlike
//! Wilks (Vanderburgh and Batterham). The coefficients are reproduced here
//! as independently published by USA Powerlifting and the USPA, and are
//! consistent with the formula implemented in OpenPowerlifting's own
//! open-source coefficient library.
//!
//! References: USA Powerlifting, "Pro Athletes" coefficient page,
//! <https://www.usapowerlifting.com/pro>; USPA Rulebook.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

pub const NAME: &str = "dots";

pub const REFERENCE: &str = "USA Powerlifting. Pro Athletes - DOTS Coefficients. https://www.usapowerlifting.com/pro. United States Powerlifting Association (USPA) Rulebook. https://uspowerlifting.org/rulebook/.";

pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Public-domain mathematical formula - coefficients published by USA Powerlifting and the USPA",
    "https://www.usapowerlifting.com/pro",
);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sex {
    Male,
    Female,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LiftType {
    BenchPress,
    ThreeLiftTotal,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DotsInput {
    pub sex: Sex,
    /// Validated powerlifting application of the coefficient.
    pub lift_type: LiftType,
    /// Bodyweight in kilograms.
    pub bodyweight_kg: f64,
    /// Bench press or summed squat, bench press, and deadlift total in kilograms.
    pub lifted_kg: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DotsOutcome {
    pub coefficient_bodyweight_kg: f64,
    pub coefficient_was_capped: bool,
    pub coefficient: f64,
    pub score: f64,
    pub interpretation: String,
}

fn maximum_coefficient_bodyweight(sex: Sex) -> f64 {
    match sex {
        Sex::Male => 210.0,
        Sex::Female => 150.0,
    }
}

fn raw_coefficient(sex: Sex, bodyweight_kg: f64) -> f64 {
    let x = bodyweight_kg;
    let (a, b, c, d, e): (f64, f64, f64, f64, f64) = match sex {
        Sex::Male => (
            -0.0000010930,
            0.0007391293,
            -0.1918759221,
            24.0900756,
            -307.75076,
        ),
        Sex::Female => (
            -0.0000010706,
            0.0005158568,
            -0.1126655495,
            13.6175032,
            -57.96288,
        ),
    };
    let denominator = (((a * x + b) * x + c) * x + d) * x + e;
    500.0 / denominator
}

fn round4(v: f64) -> f64 {
    (v * 10_000.0).round() / 10_000.0
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

pub fn compute(input: &DotsInput) -> Result<DotsOutcome, CalcError> {
    if !input.bodyweight_kg.is_finite() || input.bodyweight_kg < 40.0 {
        return Err(CalcError::InvalidInput(
            "bodyweight_kg must be finite and at least 40 - the published formula does not cover lower bodyweights".into(),
        ));
    }
    if !input.lifted_kg.is_finite() || input.lifted_kg <= 0.0 {
        return Err(CalcError::InvalidInput(
            "lifted_kg must be finite and positive".into(),
        ));
    }

    let maximum_bodyweight = maximum_coefficient_bodyweight(input.sex);
    let coefficient_bodyweight_kg = input.bodyweight_kg.min(maximum_bodyweight);
    let coefficient_was_capped = input.bodyweight_kg > maximum_bodyweight;
    let raw_coefficient = raw_coefficient(input.sex, coefficient_bodyweight_kg);
    let coefficient = round4(raw_coefficient);
    let score = round2(raw_coefficient * input.lifted_kg);
    if !score.is_finite() {
        return Err(CalcError::InvalidInput(
            "lifted_kg is too large to produce a finite score".into(),
        ));
    }
    let sex_label = match input.sex {
        Sex::Male => "male",
        Sex::Female => "female",
    };
    let lift_label = match input.lift_type {
        LiftType::BenchPress => "bench press",
        LiftType::ThreeLiftTotal => "three-lift total",
    };
    let cap_note = if coefficient_was_capped {
        format!(
            " The source formula's coefficient is capped at {maximum_bodyweight:.1} kg for this category."
        )
    } else {
        String::new()
    };

    let interpretation = format!(
        "DOTS coefficient {coefficient:.4} for a {sex_label} lifter at {:.2} kg bodyweight, applied to a {:.1} kg {lift_label}, gives a DOTS score of {score:.2}. Higher scores represent stronger performances relative to bodyweight within the same source category. DOTS (Dynamic Objective Team Scoring) is used by USA Powerlifting and the USPA as an alternative to the IPF-era Wilks coefficient.{cap_note}",
        input.bodyweight_kg, input.lifted_kg,
    );

    Ok(DotsOutcome {
        coefficient_bodyweight_kg,
        coefficient_was_capped,
        coefficient,
        score,
        interpretation,
    })
}

pub fn build_response(input: &DotsInput) -> Result<CalculationResponse, CalcError> {
    let o = compute(input)?;

    let mut working = Map::new();
    working.insert("sex".into(), json!(input.sex));
    working.insert("lift_type".into(), json!(input.lift_type));
    working.insert("bodyweight_kg".into(), json!(input.bodyweight_kg));
    working.insert("lifted_kg".into(), json!(input.lifted_kg));
    working.insert(
        "coefficient_bodyweight_kg".into(),
        json!(o.coefficient_bodyweight_kg),
    );
    working.insert(
        "coefficient_was_capped".into(),
        json!(o.coefficient_was_capped),
    );
    working.insert("coefficient".into(), json!(o.coefficient));

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(o.score),
        interpretation: o.interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

pub struct Dots;

impl Calculator for Dots {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "DOTS Score"
    }

    fn description(&self) -> &'static str {
        "Bodyweight-adjusted powerlifting score for bench press or three-lift total using the DOTS coefficient, an alternative to the shipped Wilks score."
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
            "title": "DotsInput",
            "type": "object",
            "additionalProperties": false,
            "required": ["sex", "lift_type", "bodyweight_kg", "lifted_kg"],
            "properties": {
                "sex": {
                    "type": "string",
                    "enum": ["male", "female"],
                    "description": "Competition category from the source formula (determines which coefficient polynomial is applied)"
                },
                "lift_type": {
                    "type": "string",
                    "enum": ["bench_press", "three_lift_total"],
                    "description": "Validated application: bench press, or the sum of the best squat, bench press, and deadlift"
                },
                "bodyweight_kg": {
                    "type": "number",
                    "minimum": 40,
                    "description": "Bodyweight in kg. The published formula starts at 40 kg; the coefficient is capped above 210 kg for men and 150 kg for women."
                },
                "lifted_kg": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Bench press or summed three-lift competition total in kg"
                }
            }
        })
    }

    fn calculate(&self, input: &Value) -> Result<CalculationResponse, CalcError> {
        let parsed: DotsInput = serde_json::from_value(input.clone())
            .map_err(|e| CalcError::InvalidInput(e.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn calc(sex: Sex, bodyweight_kg: f64, lifted_kg: f64) -> DotsInput {
        DotsInput {
            sex,
            lift_type: LiftType::ThreeLiftTotal,
            bodyweight_kg,
            lifted_kg,
        }
    }

    #[test]
    fn male_worked_example_90kg_600kg_total() {
        // USA Powerlifting worked example: 90 kg male, 600 kg total -> 387.96 DOTS.
        let o = compute(&calc(Sex::Male, 90.0, 600.0)).unwrap();
        assert!((o.score - 387.96).abs() < 0.01, "got {:.2}", o.score);
    }

    #[test]
    fn female_worked_example_63kg_350kg_total() {
        // 63 kg female, 350 kg total -> 376.43 DOTS.
        let o = compute(&calc(Sex::Female, 63.0, 350.0)).unwrap();
        assert!((o.score - 376.43).abs() < 0.01, "got {:.2}", o.score);
    }

    #[test]
    fn male_worked_example_83kg_600kg_total() {
        // 83 kg male, 600 kg total -> 405.05 DOTS.
        let o = compute(&calc(Sex::Male, 83.0, 600.0)).unwrap();
        assert!((o.score - 405.05).abs() < 0.01, "got {:.2}", o.score);
    }

    #[test]
    fn female_worked_example_63kg_400kg_total() {
        // 63 kg female, 400 kg total -> 430.21 DOTS.
        let o = compute(&calc(Sex::Female, 63.0, 400.0)).unwrap();
        assert!((o.score - 430.21).abs() < 0.01, "got {:.2}", o.score);
    }

    #[test]
    fn accepts_published_bodyweight_boundaries() {
        assert!(compute(&calc(Sex::Male, 40.0, 100.0)).is_ok());
        assert!(compute(&calc(Sex::Male, 210.0, 100.0)).is_ok());
        assert!(compute(&calc(Sex::Female, 40.0, 100.0)).is_ok());
        assert!(compute(&calc(Sex::Female, 150.0, 100.0)).is_ok());
    }

    #[test]
    fn rejects_bodyweight_below_published_formula() {
        assert!(compute(&calc(Sex::Male, 39.9, 100.0)).is_err());
        assert!(compute(&calc(Sex::Female, 39.9, 100.0)).is_err());
    }

    #[test]
    fn caps_coefficients_above_source_formula_ceiling() {
        let man = compute(&calc(Sex::Male, 260.0, 500.0)).unwrap();
        assert_eq!(man.coefficient_bodyweight_kg, 210.0);
        assert!(man.coefficient_was_capped);

        let woman = compute(&calc(Sex::Female, 200.0, 300.0)).unwrap();
        assert_eq!(woman.coefficient_bodyweight_kg, 150.0);
        assert!(woman.coefficient_was_capped);
    }

    #[test]
    fn does_not_report_capping_at_the_ceiling() {
        let o = compute(&calc(Sex::Male, 210.0, 500.0)).unwrap();
        assert!(!o.coefficient_was_capped);
    }

    #[test]
    fn rejects_non_positive_lifted_weight() {
        assert!(compute(&calc(Sex::Male, 100.0, 0.0)).is_err());
        assert!(compute(&calc(Sex::Male, 100.0, -10.0)).is_err());
    }

    #[test]
    fn does_not_apply_an_unsupported_lifted_weight_ceiling() {
        assert!(compute(&calc(Sex::Male, 100.0, 1500.1)).is_ok());
    }

    #[test]
    fn rejects_lifted_weight_that_overflows_the_score() {
        assert!(compute(&calc(Sex::Female, 40.0, f64::MAX)).is_err());
    }

    #[test]
    fn dynamic_calculate_matches_typed() {
        let value = json!({
            "sex": "female",
            "lift_type": "bench_press",
            "bodyweight_kg": 63.0,
            "lifted_kg": 250.0
        });
        let dynamic = Dots.calculate(&value).unwrap();
        let typed = build_response(&DotsInput {
            sex: Sex::Female,
            lift_type: LiftType::BenchPress,
            bodyweight_kg: 63.0,
            lifted_kg: 250.0,
        })
        .unwrap();
        assert_eq!(dynamic, typed);
    }

    #[test]
    fn rejects_unvalidated_individual_lift_types() {
        let value = json!({
            "sex": "male",
            "lift_type": "deadlift",
            "bodyweight_kg": 100.0,
            "lifted_kg": 300.0
        });
        assert!(Dots.calculate(&value).is_err());
    }

    #[test]
    fn response_preserves_inputs_and_coefficient() {
        let response = build_response(&calc(Sex::Male, 90.0, 600.0)).unwrap();
        assert_eq!(response.working["sex"], json!("male"));
        assert_eq!(response.working["lift_type"], json!("three_lift_total"));
        assert_eq!(response.working["bodyweight_kg"], json!(90.0));
        assert_eq!(response.working["lifted_kg"], json!(600.0));
        assert_eq!(response.working["coefficient_bodyweight_kg"], json!(90.0));
        assert_eq!(response.working["coefficient_was_capped"], json!(false));
        assert_eq!(response.result, json!(387.96));
    }

    #[test]
    fn schema_exposes_supported_lifts_and_cap_behavior() {
        let schema = Dots.input_schema();
        assert_eq!(
            schema["properties"]["lift_type"]["enum"],
            json!(["bench_press", "three_lift_total"])
        );
        assert_eq!(schema["properties"]["bodyweight_kg"]["minimum"], json!(40));
        assert!(
            schema["properties"]["bodyweight_kg"]
                .get("maximum")
                .is_none()
        );
        assert!(schema["properties"]["lifted_kg"].get("maximum").is_none());
    }
}
