// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! Protein target for energy-restricted, resistance-trained individuals.
//!
//! The shipped `protein_target` calculator deliberately excludes energy
//! restriction (Morton et al. studied healthy adults who were not dieting).
//! This calculator covers that excluded population, implementing the
//! practical-application scheme (Table 3) from the current systematic
//! review with meta-regression on this exact question:
//!
//! Refalo MC, Trexler ET, Helms ER. Effect of Dietary Protein on Fat-Free
//! Mass in Energy Restricted, Resistance-Trained Individuals: An Updated
//! Systematic Review With Meta-Regression. Strength Cond J.
//! 2026;48(4):398-412. doi:10.1519/SSC.0000000000000888. This supersedes
//! the earlier Helms et al. (2014) review (Int J Sport Nutr Exerc Metab.
//! 2014;24(2):127-138. doi:10.1123/ijsnem.2013-0054), which first proposed
//! higher protein intakes for lean, energy-restricted resistance-trained
//! athletes, and is consistent with the International Society of Sports
//! Nutrition's current position stand on diets for body weight reduction
//! (Aragon et al. J Int Soc Sports Nutr. 2026;23(1):2740266.
//! doi:10.1080/15502783.2026.2740266), whose point 7 independently states
//! that 1.9-3.2 g/kg body weight/day can maximise lean mass retention in
//! lean, resistance-trained individuals under hypocaloric conditions.
//!
//! Table 3's scheme combines two clinician-asserted factors - perceived
//! risk of fat-free mass (FFM) loss, and the personal/sporting importance of
//! FFM retention - into three priority bands, each expressed as both a
//! total-body-weight and a fat-free-mass per-kilogram range:
//!
//! - Both factors present ("High"): 1.9-3.2 g/kg body weight/day, or
//!   2.5-4.2 g/kg fat-free mass/day.
//! - Exactly one factor present ("Moderate"): at least 1.9 g/kg body
//!   weight/day, or at least 2.5 g/kg fat-free mass/day (floor only).
//! - Neither factor present ("Low"): up to 1.9 g/kg body weight/day, or up
//!   to 2.5 g/kg fat-free mass/day (ceiling only).

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

pub const NAME: &str = "energy_restricted_protein_target";

pub const REFERENCE: &str = "Refalo MC, Trexler ET, Helms ER. Effect of Dietary Protein on Fat-Free Mass in Energy Restricted, Resistance-Trained Individuals: An Updated Systematic Review With Meta-Regression. Strength Cond J. 2026;48(4):398-412. doi:10.1519/SSC.0000000000000888. Helms ER, Zinn C, Rowlands DS, Brown SR. A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes. Int J Sport Nutr Exerc Metab. 2014;24(2):127-138. doi:10.1123/ijsnem.2013-0054. Aragon AA, et al. International Society of Sports Nutrition position stand: diets for body weight reduction. J Int Soc Sports Nutr. 2026;23(1):2740266. doi:10.1080/15502783.2026.2740266.";

pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "Published mathematical method - independently implemented; formulas and algorithms are not protected by US copyright",
    "https://www.copyright.gov/circs/circ31.pdf",
);

const BM_LOW_BOUND_G_PER_KG: f64 = 1.9;
const BM_HIGH_CEILING_G_PER_KG: f64 = 3.2;
const FFM_LOW_BOUND_G_PER_KG: f64 = 2.5;
const FFM_HIGH_CEILING_G_PER_KG: f64 = 4.2;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EvidenceContext {
    EnergyRestrictedResistanceTrainedAdult,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PriorityBand {
    Low,
    Moderate,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EnergyRestrictedProteinTargetInput {
    /// Attestation that the person matches the source population and training context.
    pub evidence_context: EvidenceContext,
    /// Total body weight in kilograms.
    pub weight_kg: f64,
    /// Fat-free mass in kilograms (e.g. from DEXA, BIA, or skinfold estimate).
    pub fat_free_mass_kg: f64,
    /// Clinician-asserted: perceived risk of FFM loss is elevated (e.g. low body fat, large energy deficit).
    pub perceived_risk_of_ffm_loss: bool,
    /// Clinician-asserted: retaining FFM is a priority (e.g. the person's sport or goals require it).
    pub importance_of_ffm_retention: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EnergyRestrictedProteinTargetOutcome {
    pub band: PriorityBand,
    pub bm_floor_g_per_day: Option<f64>,
    pub bm_ceiling_g_per_day: Option<f64>,
    pub ffm_floor_g_per_day: Option<f64>,
    pub ffm_ceiling_g_per_day: Option<f64>,
}

fn band(perceived_risk: bool, importance: bool) -> PriorityBand {
    match (perceived_risk, importance) {
        (true, true) => PriorityBand::High,
        (false, false) => PriorityBand::Low,
        _ => PriorityBand::Moderate,
    }
}

pub fn compute(
    input: &EnergyRestrictedProteinTargetInput,
) -> Result<EnergyRestrictedProteinTargetOutcome, CalcError> {
    if !(20.0..=300.0).contains(&input.weight_kg) || !input.weight_kg.is_finite() {
        return Err(CalcError::InvalidInput(
            "weight_kg must be finite and between 20 and 300; this is a broad input-safety guard, not a source-study eligibility range"
                .into(),
        ));
    }
    if !(10.0..=250.0).contains(&input.fat_free_mass_kg) || !input.fat_free_mass_kg.is_finite() {
        return Err(CalcError::InvalidInput(
            "fat_free_mass_kg must be finite and between 10 and 250".into(),
        ));
    }
    if input.fat_free_mass_kg > input.weight_kg {
        return Err(CalcError::InvalidInput(
            "fat_free_mass_kg cannot be greater than weight_kg".into(),
        ));
    }

    let band = band(
        input.perceived_risk_of_ffm_loss,
        input.importance_of_ffm_retention,
    );

    let (bm_floor, bm_ceiling, ffm_floor, ffm_ceiling) = match band {
        PriorityBand::Low => (
            None,
            Some(input.weight_kg * BM_LOW_BOUND_G_PER_KG),
            None,
            Some(input.fat_free_mass_kg * FFM_LOW_BOUND_G_PER_KG),
        ),
        PriorityBand::Moderate => (
            Some(input.weight_kg * BM_LOW_BOUND_G_PER_KG),
            None,
            Some(input.fat_free_mass_kg * FFM_LOW_BOUND_G_PER_KG),
            None,
        ),
        PriorityBand::High => (
            Some(input.weight_kg * BM_LOW_BOUND_G_PER_KG),
            Some(input.weight_kg * BM_HIGH_CEILING_G_PER_KG),
            Some(input.fat_free_mass_kg * FFM_LOW_BOUND_G_PER_KG),
            Some(input.fat_free_mass_kg * FFM_HIGH_CEILING_G_PER_KG),
        ),
    };

    Ok(EnergyRestrictedProteinTargetOutcome {
        band,
        bm_floor_g_per_day: bm_floor,
        bm_ceiling_g_per_day: bm_ceiling,
        ffm_floor_g_per_day: ffm_floor,
        ffm_ceiling_g_per_day: ffm_ceiling,
    })
}

fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

fn primary_bm_g_per_day(outcome: &EnergyRestrictedProteinTargetOutcome) -> f64 {
    outcome
        .bm_floor_g_per_day
        .or(outcome.bm_ceiling_g_per_day)
        .expect("band always sets a floor or a ceiling")
}

pub fn build_response(
    input: &EnergyRestrictedProteinTargetInput,
) -> Result<CalculationResponse, CalcError> {
    let outcome = compute(input)?;
    let result = round1(primary_bm_g_per_day(&outcome));

    let mut working = Map::new();
    working.insert("evidence_context".into(), json!(input.evidence_context));
    working.insert("weight_kg".into(), json!(input.weight_kg));
    working.insert("fat_free_mass_kg".into(), json!(input.fat_free_mass_kg));
    working.insert(
        "perceived_risk_of_ffm_loss".into(),
        json!(input.perceived_risk_of_ffm_loss),
    );
    working.insert(
        "importance_of_ffm_retention".into(),
        json!(input.importance_of_ffm_retention),
    );
    working.insert("band".into(), json!(outcome.band));
    working.insert(
        "bm_floor_g_per_day".into(),
        json!(outcome.bm_floor_g_per_day.map(round1)),
    );
    working.insert(
        "bm_ceiling_g_per_day".into(),
        json!(outcome.bm_ceiling_g_per_day.map(round1)),
    );
    working.insert(
        "ffm_floor_g_per_day".into(),
        json!(outcome.ffm_floor_g_per_day.map(round1)),
    );
    working.insert(
        "ffm_ceiling_g_per_day".into(),
        json!(outcome.ffm_ceiling_g_per_day.map(round1)),
    );
    working.insert("result_metric".into(), json!("bm_based_g_per_day"));

    let band_label = match outcome.band {
        PriorityBand::Low => "Low",
        PriorityBand::Moderate => "Moderate",
        PriorityBand::High => "High",
    };
    let bm_range = match (outcome.bm_floor_g_per_day, outcome.bm_ceiling_g_per_day) {
        (Some(floor), Some(ceiling)) => {
            format!(
                "{:.1}-{:.1} g/day ({BM_LOW_BOUND_G_PER_KG:.1}-{BM_HIGH_CEILING_G_PER_KG:.1} g/kg body weight/day)",
                round1(floor),
                round1(ceiling)
            )
        }
        (Some(floor), None) => format!(
            "at least {:.1} g/day (at least {BM_LOW_BOUND_G_PER_KG:.1} g/kg body weight/day)",
            round1(floor)
        ),
        (None, Some(ceiling)) => format!(
            "up to {:.1} g/day (up to {BM_LOW_BOUND_G_PER_KG:.1} g/kg body weight/day)",
            round1(ceiling)
        ),
        (None, None) => unreachable!("band always sets a floor or a ceiling"),
    };
    let ffm_range = match (outcome.ffm_floor_g_per_day, outcome.ffm_ceiling_g_per_day) {
        (Some(floor), Some(ceiling)) => format!(
            "{:.1}-{:.1} g/day ({FFM_LOW_BOUND_G_PER_KG:.1}-{FFM_HIGH_CEILING_G_PER_KG:.1} g/kg fat-free mass/day)",
            round1(floor),
            round1(ceiling)
        ),
        (Some(floor), None) => format!(
            "at least {:.1} g/day (at least {FFM_LOW_BOUND_G_PER_KG:.1} g/kg fat-free mass/day)",
            round1(floor)
        ),
        (None, Some(ceiling)) => format!(
            "up to {:.1} g/day (up to {FFM_LOW_BOUND_G_PER_KG:.1} g/kg fat-free mass/day)",
            round1(ceiling)
        ),
        (None, None) => unreachable!("band always sets a floor or a ceiling"),
    };

    let interpretation = format!(
        "{band_label} priority for fat-free mass retention: {bm_range}, or equivalently {ffm_range}. This band reflects two clinician-asserted factors from Refalo et al.'s practical-application scheme: perceived risk of FFM loss ({perceived_risk}) and the personal or sporting importance of retaining FFM ({importance}). Both present gives the High band (a bounded range); exactly one gives Moderate (a floor only, no stated ceiling); neither gives Low (a ceiling only, no stated floor). This applies only to energy-restricted, resistance-trained adults, and is not a general dietary protein recommendation.",
        perceived_risk = input.perceived_risk_of_ffm_loss,
        importance = input.importance_of_ffm_retention,
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(result),
        interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

pub struct EnergyRestrictedProteinTarget;

impl Calculator for EnergyRestrictedProteinTarget {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "Energy-Restricted Protein Target"
    }

    fn description(&self) -> &'static str {
        "Protein target for energy-restricted, resistance-trained adults from Refalo et al.'s practical-application scheme, banding body-weight and fat-free-mass targets by perceived FFM-loss risk and the importance of FFM retention."
    }

    fn reference(&self) -> &'static str {
        REFERENCE
    }

    fn license(&self) -> CalculatorLicense {
        LICENSE
    }

    fn input_schema(&self) -> Value {
        let source = json!({
            "citation": REFERENCE,
            "url": "https://doi.org/10.1519/SSC.0000000000000888"
        });
        json!({
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "EnergyRestrictedProteinTargetInput",
            "description": "Protein target for energy-restricted, resistance-trained adults, from Refalo et al.'s Table 3 practical-application scheme. Returns both a total-body-weight and a fat-free-mass per-kilogram range, banded by two clinician-asserted factors.",
            "type": "object",
            "additionalProperties": false,
            "required": ["evidence_context", "weight_kg", "fat_free_mass_kg", "perceived_risk_of_ffm_loss", "importance_of_ffm_retention"],
            "properties": {
                "evidence_context": {
                    "type": "string",
                    "const": "energy_restricted_resistance_trained_adult",
                    "unit": "none",
                    "description": "Attestation that the person matches the source population and training context",
                    "definition": {
                        "concept": "Refalo 2026 energy-restricted protein meta-regression evidence context",
                        "statement": "Select this value only for an energy-restricted (hypocaloric) adult who is undertaking resistance training.",
                        "includes": ["Age 18 years or older", "Caloric deficit (energy restriction)", "Resistance training"],
                        "excludes": ["Children", "Non-energy-restricted adults (use the standard protein_target calculator instead)", "Pregnancy", "Renal or hepatic disease", "Eating disorders", "Serious illness"],
                        "source": source,
                        "snomedEcl": null,
                        "refset": null,
                        "caveats": "The source evidence base is predominantly lean, resistance-trained athletes; extrapolation to higher body-fat or non-athletic populations is less certain.",
                        "status": "draft"
                    }
                },
                "weight_kg": {
                    "type": "number",
                    "minimum": 20,
                    "maximum": 300,
                    "unit": "kg",
                    "description": "Current total body weight in kilograms. The 20-300 kg range is a broad input-safety guard, not a source-study eligibility range."
                },
                "fat_free_mass_kg": {
                    "type": "number",
                    "minimum": 10,
                    "maximum": 250,
                    "unit": "kg",
                    "description": "Fat-free mass in kilograms, from DEXA, BIA, or a skinfold estimate. Must not exceed weight_kg."
                },
                "perceived_risk_of_ffm_loss": {
                    "type": "boolean",
                    "description": "Clinician-asserted: perceived risk of fat-free mass loss is elevated",
                    "definition": {
                        "concept": "Perceived risk of FFM loss",
                        "statement": "True when the clinician judges the person to be at elevated risk of losing fat-free mass during the planned energy restriction.",
                        "includes": ["Low body fat percentage", "Large energy deficit", "Aggressive or prolonged caloric restriction"],
                        "excludes": ["Higher body fat with a modest, well-managed deficit"],
                        "source": source,
                        "snomedEcl": null,
                        "refset": null,
                        "caveats": "This is a clinician judgement, not a measured threshold; Refalo et al. do not define a numeric cut-off for 'perceived risk'.",
                        "status": "draft"
                    }
                },
                "importance_of_ffm_retention": {
                    "type": "boolean",
                    "description": "Clinician-asserted: retaining fat-free mass is a priority for this person",
                    "definition": {
                        "concept": "Importance of FFM retention",
                        "statement": "True when retaining fat-free mass is a stated priority, for example because of sporting performance requirements.",
                        "includes": ["Competitive athlete whose sport requires strength or muscle mass", "Explicit goal of body recomposition rather than weight loss alone"],
                        "excludes": ["Weight loss is the sole goal with no stated preference to protect muscle mass"],
                        "source": source,
                        "snomedEcl": null,
                        "refset": null,
                        "caveats": "This is a clinician/person judgement of priority, not a measured value.",
                        "status": "draft"
                    }
                }
            }
        })
    }

    fn calculate(&self, input: &Value) -> Result<CalculationResponse, CalcError> {
        let parsed: EnergyRestrictedProteinTargetInput = serde_json::from_value(input.clone())
            .map_err(|e| CalcError::InvalidInput(e.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(
        weight_kg: f64,
        fat_free_mass_kg: f64,
        perceived_risk: bool,
        importance: bool,
    ) -> EnergyRestrictedProteinTargetInput {
        EnergyRestrictedProteinTargetInput {
            evidence_context: EvidenceContext::EnergyRestrictedResistanceTrainedAdult,
            weight_kg,
            fat_free_mass_kg,
            perceived_risk_of_ffm_loss: perceived_risk,
            importance_of_ffm_retention: importance,
        }
    }

    #[test]
    fn high_band_when_both_factors_present() {
        let o = compute(&input(70.0, 56.0, true, true)).unwrap();
        assert_eq!(o.band, PriorityBand::High);
        assert!((o.bm_floor_g_per_day.unwrap() - 133.0).abs() < 1e-9);
        assert!((o.bm_ceiling_g_per_day.unwrap() - 224.0).abs() < 1e-9);
        assert!((o.ffm_floor_g_per_day.unwrap() - 140.0).abs() < 1e-9);
        assert!((o.ffm_ceiling_g_per_day.unwrap() - 235.2).abs() < 1e-9);
    }

    #[test]
    fn moderate_band_when_exactly_one_factor_present() {
        let risk_only = compute(&input(70.0, 56.0, true, false)).unwrap();
        assert_eq!(risk_only.band, PriorityBand::Moderate);
        assert!((risk_only.bm_floor_g_per_day.unwrap() - 133.0).abs() < 1e-9);
        assert!(risk_only.bm_ceiling_g_per_day.is_none());
        assert!((risk_only.ffm_floor_g_per_day.unwrap() - 140.0).abs() < 1e-9);
        assert!(risk_only.ffm_ceiling_g_per_day.is_none());

        let importance_only = compute(&input(70.0, 56.0, false, true)).unwrap();
        assert_eq!(importance_only.band, PriorityBand::Moderate);
    }

    #[test]
    fn low_band_when_neither_factor_present() {
        let o = compute(&input(70.0, 56.0, false, false)).unwrap();
        assert_eq!(o.band, PriorityBand::Low);
        assert!(o.bm_floor_g_per_day.is_none());
        assert!((o.bm_ceiling_g_per_day.unwrap() - 133.0).abs() < 1e-9);
        assert!(o.ffm_floor_g_per_day.is_none());
        assert!((o.ffm_ceiling_g_per_day.unwrap() - 140.0).abs() < 1e-9);
    }

    #[test]
    fn rejects_fat_free_mass_greater_than_weight() {
        assert!(compute(&input(60.0, 65.0, true, true)).is_err());
    }

    #[test]
    fn rejects_out_of_range_or_non_finite_weight() {
        assert!(compute(&input(19.9, 15.0, true, true)).is_err());
        assert!(compute(&input(300.1, 15.0, true, true)).is_err());
        assert!(compute(&input(f64::NAN, 15.0, true, true)).is_err());
    }

    #[test]
    fn rejects_out_of_range_fat_free_mass() {
        assert!(compute(&input(70.0, 9.9, true, true)).is_err());
        assert!(compute(&input(70.0, 250.1, true, true)).is_err());
    }

    #[test]
    fn dynamic_calculate_matches_typed() {
        let value = json!({
            "evidence_context": "energy_restricted_resistance_trained_adult",
            "weight_kg": 70.0,
            "fat_free_mass_kg": 56.0,
            "perceived_risk_of_ffm_loss": true,
            "importance_of_ffm_retention": true
        });
        let dynamic = EnergyRestrictedProteinTarget.calculate(&value).unwrap();
        let typed = build_response(&input(70.0, 56.0, true, true)).unwrap();
        assert_eq!(dynamic, typed);
    }

    #[test]
    fn dynamic_surface_rejects_unknown_fields_and_wrong_context() {
        let unknown = json!({
            "evidence_context": "energy_restricted_resistance_trained_adult",
            "weight_kg": 70.0,
            "fat_free_mass_kg": 56.0,
            "perceived_risk_of_ffm_loss": true,
            "importance_of_ffm_retention": true,
            "unexpected": true
        });
        assert!(EnergyRestrictedProteinTarget.calculate(&unknown).is_err());

        let wrong_context = json!({
            "evidence_context": "healthy_adult_not_energy_restricted_resistance_training",
            "weight_kg": 70.0,
            "fat_free_mass_kg": 56.0,
            "perceived_risk_of_ffm_loss": true,
            "importance_of_ffm_retention": true
        });
        assert!(
            EnergyRestrictedProteinTarget
                .calculate(&wrong_context)
                .is_err()
        );
    }

    #[test]
    fn response_reports_bm_result_and_full_working() {
        let response = build_response(&input(70.0, 56.0, true, true)).unwrap();
        assert_eq!(response.result, json!(133.0));
        assert_eq!(response.working["band"], json!("high"));
        assert_eq!(response.working["bm_floor_g_per_day"], json!(133.0));
        assert_eq!(response.working["bm_ceiling_g_per_day"], json!(224.0));
        assert_eq!(response.working["ffm_floor_g_per_day"], json!(140.0));
        assert_eq!(response.working["ffm_ceiling_g_per_day"], json!(235.2));
        assert!(response.interpretation.contains("High priority"));

        let low = build_response(&input(70.0, 56.0, false, false)).unwrap();
        assert_eq!(low.result, json!(133.0));
        assert_eq!(low.working["bm_floor_g_per_day"], json!(null));
        assert_eq!(low.working["bm_ceiling_g_per_day"], json!(133.0));
        assert!(low.interpretation.contains("Low priority"));

        let moderate = build_response(&input(70.0, 56.0, true, false)).unwrap();
        assert_eq!(moderate.working["bm_ceiling_g_per_day"], json!(null));
        assert!(moderate.interpretation.contains("Moderate priority"));
    }

    #[test]
    fn schema_defines_both_clinician_asserted_factors() {
        let schema = EnergyRestrictedProteinTarget.input_schema();
        assert_eq!(
            schema["required"],
            json!([
                "evidence_context",
                "weight_kg",
                "fat_free_mass_kg",
                "perceived_risk_of_ffm_loss",
                "importance_of_ffm_retention"
            ])
        );
        assert!(
            schema["properties"]["perceived_risk_of_ffm_loss"]["definition"]["statement"]
                .as_str()
                .unwrap()
                .contains("elevated risk")
        );
        assert!(
            schema["properties"]["importance_of_ffm_retention"]["definition"]["statement"]
                .as_str()
                .unwrap()
                .contains("priority")
        );
    }
}
