// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

//! ACMI - the Anticholinergic Medication Index.
//!
//! Scores cumulative anticholinergic burden (0-100) from a patient's current
//! anticholinergic prescriptions, using per-medication weights derived from a
//! clinical prediction model for falls and delirium in adults aged over 65
//! (Best et al, BMJ Medicine 2026).
//!
//! The 88 medication weights are reproduced directly from the primary
//! source's Table 3 ("ACMI score" column), not recomputed from the
//! underlying Cox-model coefficients also published there: the paper itself
//! cautions that "these coefficients should not be interpreted as distinct
//! and unbiased quantifications of the relation with the dependent
//! variable", so the published, already-transformed ACMI score is the
//! correct value to use, not a re-derivation from the raw coefficients.
//!
//! By construction (the authors shifted every coefficient to a positive
//! scale and normalised so a hypothetical patient prescribed all 88
//! medications scores 100), a real patient's score is simply the sum of the
//! listed scores for their distinct current anticholinergic medications -
//! no further transformation is needed here.
//!
//! This calculator implements the ACMI burden score only. The primary
//! source combines it with a separate one-year predicted risk of hospital
//! admission for falls or delirium, a full Cox model requiring age, sex,
//! frailty, and eight comorbidity predictors with only two published
//! baseline-hazard time points - a materially larger, separately-scoped
//! piece of work, not implemented here.

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::calculator::{CalcError, Calculator};
use crate::license::CalculatorLicense;
use crate::response::CalculationResponse;

pub const NAME: &str = "acmi";

pub const REFERENCE: &str = "Best KE, Butters O, Schofield PG, et al. Deriving the anticholinergic medication index for delirium and falls in older people: development and external validation of a risk prediction model. BMJ Med. 2026;5(1):e002835. doi:10.1136/bmjmed-2026-002835.";

pub const LICENSE: CalculatorLicense = CalculatorLicense::new(
    "CC BY 4.0 - medication weights (Table 3) reproduced with attribution from the primary publication, an open access article distributed under the Creative Commons Attribution 4.0 licence",
    "https://doi.org/10.1136/bmjmed-2026-002835",
);

/// One of the 88 medications scored by the ACMI, identified by its
/// international non-proprietary name. Formulation, brand, and dose are not
/// distinguished - the primary model treats any use of the drug as binary.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Medication {
    Alverine,
    Amantadine,
    Amisulpride,
    Amitriptyline,
    Aripiprazole,
    Atenolol,
    Atropine,
    Baclofen,
    Bendroflumethiazide,
    Betamethasone,
    Bumetanide,
    Buprenorphine,
    Captopril,
    Carbamazepine,
    Cetirizine,
    Chlorphenamine,
    Chlorpromazine,
    Cimetidine,
    Cinnarizine,
    Citalopram,
    Clomipramine,
    Clonazepam,
    Clonidine,
    Codeine,
    Colchicine,
    Cyclizine,
    Darifenacin,
    Desloratadine,
    Dexamethasone,
    Diazepam,
    Digoxin,
    Dihydrocodeine,
    Dipyridamole,
    Dosulepin,
    Doxazosin,
    Escitalopram,
    Fentanyl,
    Fesoterodine,
    Fexofenadine,
    Fluoxetine,
    Flupentixol,
    Furosemide,
    GlycopyrroniumBromide,
    Haloperidol,
    Hydralazine,
    Hydrochlorothiazide,
    Hydrocortisone,
    Hydroxyzine,
    Hyoscine,
    Imipramine,
    Indapamide,
    Indoramin,
    Ipratropium,
    Isosorbide,
    Loperamide,
    Loratadine,
    Lorazepam,
    Mebeverine,
    Metoprolol,
    Midazolam,
    Mirtazapine,
    Morphine,
    Nefopam,
    Nifedipine,
    Nortriptyline,
    Olanzapine,
    Oxybutynin,
    Oxycodone,
    Paroxetine,
    Prednisolone,
    Prochlorperazine,
    Procyclidine,
    Promethazine,
    Quetiapine,
    Ranitidine,
    Risperidone,
    Solifenacin,
    Temazepam,
    Theophylline,
    TiotropiumBromide,
    Tolterodine,
    Tramadol,
    Trazodone,
    Trihexyphenidyl,
    TrospiumChloride,
    Umeclidinium,
    Venlafaxine,
    Warfarin,
}

/// Every medication the ACMI scores, in the order published in Table 3.
pub const ALL_MEDICATIONS: &[Medication] = &[
    Medication::Alverine,
    Medication::Amantadine,
    Medication::Amisulpride,
    Medication::Amitriptyline,
    Medication::Aripiprazole,
    Medication::Atenolol,
    Medication::Atropine,
    Medication::Baclofen,
    Medication::Bendroflumethiazide,
    Medication::Betamethasone,
    Medication::Bumetanide,
    Medication::Buprenorphine,
    Medication::Captopril,
    Medication::Carbamazepine,
    Medication::Cetirizine,
    Medication::Chlorphenamine,
    Medication::Chlorpromazine,
    Medication::Cimetidine,
    Medication::Cinnarizine,
    Medication::Citalopram,
    Medication::Clomipramine,
    Medication::Clonazepam,
    Medication::Clonidine,
    Medication::Codeine,
    Medication::Colchicine,
    Medication::Cyclizine,
    Medication::Darifenacin,
    Medication::Desloratadine,
    Medication::Dexamethasone,
    Medication::Diazepam,
    Medication::Digoxin,
    Medication::Dihydrocodeine,
    Medication::Dipyridamole,
    Medication::Dosulepin,
    Medication::Doxazosin,
    Medication::Escitalopram,
    Medication::Fentanyl,
    Medication::Fesoterodine,
    Medication::Fexofenadine,
    Medication::Fluoxetine,
    Medication::Flupentixol,
    Medication::Furosemide,
    Medication::GlycopyrroniumBromide,
    Medication::Haloperidol,
    Medication::Hydralazine,
    Medication::Hydrochlorothiazide,
    Medication::Hydrocortisone,
    Medication::Hydroxyzine,
    Medication::Hyoscine,
    Medication::Imipramine,
    Medication::Indapamide,
    Medication::Indoramin,
    Medication::Ipratropium,
    Medication::Isosorbide,
    Medication::Loperamide,
    Medication::Loratadine,
    Medication::Lorazepam,
    Medication::Mebeverine,
    Medication::Metoprolol,
    Medication::Midazolam,
    Medication::Mirtazapine,
    Medication::Morphine,
    Medication::Nefopam,
    Medication::Nifedipine,
    Medication::Nortriptyline,
    Medication::Olanzapine,
    Medication::Oxybutynin,
    Medication::Oxycodone,
    Medication::Paroxetine,
    Medication::Prednisolone,
    Medication::Prochlorperazine,
    Medication::Procyclidine,
    Medication::Promethazine,
    Medication::Quetiapine,
    Medication::Ranitidine,
    Medication::Risperidone,
    Medication::Solifenacin,
    Medication::Temazepam,
    Medication::Theophylline,
    Medication::TiotropiumBromide,
    Medication::Tolterodine,
    Medication::Tramadol,
    Medication::Trazodone,
    Medication::Trihexyphenidyl,
    Medication::TrospiumChloride,
    Medication::Umeclidinium,
    Medication::Venlafaxine,
    Medication::Warfarin,
];

impl Medication {
    /// Human-readable international non-proprietary name.
    pub fn display_name(self) -> &'static str {
        match self {
            Medication::Alverine => "Alverine",
            Medication::Amantadine => "Amantadine",
            Medication::Amisulpride => "Amisulpride",
            Medication::Amitriptyline => "Amitriptyline",
            Medication::Aripiprazole => "Aripiprazole",
            Medication::Atenolol => "Atenolol",
            Medication::Atropine => "Atropine",
            Medication::Baclofen => "Baclofen",
            Medication::Bendroflumethiazide => "Bendroflumethiazide",
            Medication::Betamethasone => "Betamethasone",
            Medication::Bumetanide => "Bumetanide",
            Medication::Buprenorphine => "Buprenorphine",
            Medication::Captopril => "Captopril",
            Medication::Carbamazepine => "Carbamazepine",
            Medication::Cetirizine => "Cetirizine",
            Medication::Chlorphenamine => "Chlorphenamine",
            Medication::Chlorpromazine => "Chlorpromazine",
            Medication::Cimetidine => "Cimetidine",
            Medication::Cinnarizine => "Cinnarizine",
            Medication::Citalopram => "Citalopram",
            Medication::Clomipramine => "Clomipramine",
            Medication::Clonazepam => "Clonazepam",
            Medication::Clonidine => "Clonidine",
            Medication::Codeine => "Codeine",
            Medication::Colchicine => "Colchicine",
            Medication::Cyclizine => "Cyclizine",
            Medication::Darifenacin => "Darifenacin",
            Medication::Desloratadine => "Desloratadine",
            Medication::Dexamethasone => "Dexamethasone",
            Medication::Diazepam => "Diazepam",
            Medication::Digoxin => "Digoxin",
            Medication::Dihydrocodeine => "Dihydrocodeine",
            Medication::Dipyridamole => "Dipyridamole",
            Medication::Dosulepin => "Dosulepin",
            Medication::Doxazosin => "Doxazosin",
            Medication::Escitalopram => "Escitalopram",
            Medication::Fentanyl => "Fentanyl",
            Medication::Fesoterodine => "Fesoterodine",
            Medication::Fexofenadine => "Fexofenadine",
            Medication::Fluoxetine => "Fluoxetine",
            Medication::Flupentixol => "Flupentixol",
            Medication::Furosemide => "Furosemide",
            Medication::GlycopyrroniumBromide => "Glycopyrronium bromide",
            Medication::Haloperidol => "Haloperidol",
            Medication::Hydralazine => "Hydralazine",
            Medication::Hydrochlorothiazide => "Hydrochlorothiazide",
            Medication::Hydrocortisone => "Hydrocortisone",
            Medication::Hydroxyzine => "Hydroxyzine",
            Medication::Hyoscine => "Hyoscine",
            Medication::Imipramine => "Imipramine",
            Medication::Indapamide => "Indapamide",
            Medication::Indoramin => "Indoramin",
            Medication::Ipratropium => "Ipratropium",
            Medication::Isosorbide => "Isosorbide",
            Medication::Loperamide => "Loperamide",
            Medication::Loratadine => "Loratadine",
            Medication::Lorazepam => "Lorazepam",
            Medication::Mebeverine => "Mebeverine",
            Medication::Metoprolol => "Metoprolol",
            Medication::Midazolam => "Midazolam",
            Medication::Mirtazapine => "Mirtazapine",
            Medication::Morphine => "Morphine",
            Medication::Nefopam => "Nefopam",
            Medication::Nifedipine => "Nifedipine",
            Medication::Nortriptyline => "Nortriptyline",
            Medication::Olanzapine => "Olanzapine",
            Medication::Oxybutynin => "Oxybutynin",
            Medication::Oxycodone => "Oxycodone",
            Medication::Paroxetine => "Paroxetine",
            Medication::Prednisolone => "Prednisolone",
            Medication::Prochlorperazine => "Prochlorperazine",
            Medication::Procyclidine => "Procyclidine",
            Medication::Promethazine => "Promethazine",
            Medication::Quetiapine => "Quetiapine",
            Medication::Ranitidine => "Ranitidine",
            Medication::Risperidone => "Risperidone",
            Medication::Solifenacin => "Solifenacin",
            Medication::Temazepam => "Temazepam",
            Medication::Theophylline => "Theophylline",
            Medication::TiotropiumBromide => "Tiotropium bromide",
            Medication::Tolterodine => "Tolterodine",
            Medication::Tramadol => "Tramadol",
            Medication::Trazodone => "Trazodone",
            Medication::Trihexyphenidyl => "Trihexyphenidyl",
            Medication::TrospiumChloride => "Trospium chloride",
            Medication::Umeclidinium => "Umeclidinium",
            Medication::Venlafaxine => "Venlafaxine",
            Medication::Warfarin => "Warfarin",
        }
    }

    /// SNOMED CT substance concept SCTID(s) for this medication, verified
    /// against the NHS dm+d ingredient simple reference set
    /// (999000791000001109) with `sct` (see `AGENTS.md`). Almost every
    /// medication maps to exactly one concept; `Isosorbide` is the one
    /// exception, because the primary source lists it without specifying an
    /// ester, so both the mononitrate and dinitrate concepts are listed
    /// pending disambiguation. The governed, reviewable codelist is
    /// `spec/codelists/acmi-medications.codelist`.
    pub fn snomed_ids(self) -> &'static [u64] {
        match self {
            Medication::Alverine => &[418483003],
            Medication::Amantadine => &[372763006],
            Medication::Amisulpride => &[391761004],
            Medication::Amitriptyline => &[372726002],
            Medication::Aripiprazole => &[406784005],
            Medication::Atenolol => &[387506000],
            Medication::Atropine => &[372832002],
            Medication::Baclofen => &[387342009],
            Medication::Bendroflumethiazide => &[387520007],
            Medication::Betamethasone => &[116571008],
            Medication::Bumetanide => &[387498005],
            Medication::Buprenorphine => &[387173000],
            Medication::Captopril => &[387160004],
            Medication::Carbamazepine => &[387222003],
            Medication::Cetirizine => &[372523007],
            Medication::Chlorphenamine => &[372914003],
            Medication::Chlorpromazine => &[387258005],
            Medication::Cimetidine => &[373541007],
            Medication::Cinnarizine => &[395955001],
            Medication::Citalopram => &[372596005],
            Medication::Clomipramine => &[372903001],
            Medication::Clonazepam => &[387383007],
            Medication::Clonidine => &[372805007],
            Medication::Codeine => &[387494007],
            Medication::Colchicine => &[387413002],
            Medication::Cyclizine => &[387491004],
            Medication::Darifenacin => &[416140008],
            Medication::Desloratadine => &[396015008],
            Medication::Dexamethasone => &[372584003],
            Medication::Diazepam => &[387264003],
            Medication::Digoxin => &[387461009],
            Medication::Dihydrocodeine => &[387322000],
            Medication::Dipyridamole => &[387371005],
            Medication::Dosulepin => &[414047005],
            Medication::Doxazosin => &[372508002],
            Medication::Escitalopram => &[400447003],
            Medication::Fentanyl => &[373492002],
            Medication::Fesoterodine => &[432255001],
            Medication::Fexofenadine => &[372522002],
            Medication::Fluoxetine => &[372767007],
            Medication::Flupentixol => &[387567006],
            Medication::Furosemide => &[387475002],
            Medication::GlycopyrroniumBromide => &[387122008],
            Medication::Haloperidol => &[386837002],
            Medication::Hydralazine => &[387125005],
            Medication::Hydrochlorothiazide => &[387525002],
            Medication::Hydrocortisone => &[396458002],
            Medication::Hydroxyzine => &[372856003],
            Medication::Hyoscine => &[387409009],
            Medication::Imipramine => &[372718005],
            Medication::Indapamide => &[387419003],
            Medication::Indoramin => &[395748009],
            Medication::Ipratropium => &[372518007],
            Medication::Isosorbide => &[386854005, 387332007],
            Medication::Loperamide => &[387040009],
            Medication::Loratadine => &[386884002],
            Medication::Lorazepam => &[387106007],
            Medication::Mebeverine => &[419830007],
            Medication::Metoprolol => &[372826007],
            Medication::Midazolam => &[373476007],
            Medication::Mirtazapine => &[386847004],
            Medication::Morphine => &[373529000],
            Medication::Nefopam => &[419768004],
            Medication::Nifedipine => &[387490003],
            Medication::Nortriptyline => &[372652004],
            Medication::Olanzapine => &[386849001],
            Medication::Oxybutynin => &[372717000],
            Medication::Oxycodone => &[55452001],
            Medication::Paroxetine => &[372595009],
            Medication::Prednisolone => &[116601002],
            Medication::Prochlorperazine => &[372853006],
            Medication::Procyclidine => &[387247001],
            Medication::Promethazine => &[372871004],
            Medication::Quetiapine => &[386850001],
            Medication::Ranitidine => &[372755005],
            Medication::Risperidone => &[386840002],
            Medication::Solifenacin => &[407030007],
            Medication::Temazepam => &[387300007],
            Medication::Theophylline => &[372810006],
            Medication::TiotropiumBromide => &[425812008],
            Medication::Tolterodine => &[372570008],
            Medication::Tramadol => &[386858008],
            Medication::Trazodone => &[372829000],
            Medication::Trihexyphenidyl => &[387120000],
            Medication::TrospiumChloride => &[326557004],
            Medication::Umeclidinium => &[706898002],
            Medication::Venlafaxine => &[372490001],
            Medication::Warfarin => &[372756006],
        }
    }

    /// The published ACMI score (Table 3), already shifted to a positive
    /// scale and normalised so summing every medication's score totals
    /// approximately 100.
    pub fn acmi_score(self) -> f64 {
        match self {
            Medication::Alverine => 0.5,
            Medication::Amantadine => 2.3,
            Medication::Amisulpride => 1.4,
            Medication::Amitriptyline => 1.0,
            Medication::Aripiprazole => 1.5,
            Medication::Atenolol => 0.9,
            Medication::Atropine => 1.9,
            Medication::Baclofen => 1.3,
            Medication::Bendroflumethiazide => 0.7,
            Medication::Betamethasone => 0.6,
            Medication::Bumetanide => 1.4,
            Medication::Buprenorphine => 1.3,
            Medication::Captopril => 0.6,
            Medication::Carbamazepine => 1.5,
            Medication::Cetirizine => 0.9,
            Medication::Chlorphenamine => 1.2,
            Medication::Chlorpromazine => 0.7,
            Medication::Cimetidine => 1.4,
            Medication::Cinnarizine => 1.3,
            Medication::Citalopram => 1.3,
            Medication::Clomipramine => 0.9,
            Medication::Clonazepam => 1.1,
            Medication::Clonidine => 0.6,
            Medication::Codeine => 1.3,
            Medication::Colchicine => 0.6,
            Medication::Cyclizine => 1.7,
            Medication::Darifenacin => 1.3,
            Medication::Desloratadine => 0.1,
            Medication::Dexamethasone => 1.1,
            Medication::Diazepam => 1.3,
            Medication::Digoxin => 1.1,
            Medication::Dihydrocodeine => 0.9,
            Medication::Dipyridamole => 0.4,
            Medication::Dosulepin => 0.8,
            Medication::Doxazosin => 0.9,
            Medication::Escitalopram => 1.6,
            Medication::Fentanyl => 1.4,
            Medication::Fesoterodine => 1.6,
            Medication::Fexofenadine => 1.0,
            Medication::Fluoxetine => 1.4,
            Medication::Flupentixol => 1.1,
            Medication::Furosemide => 1.1,
            Medication::GlycopyrroniumBromide => 0.9,
            Medication::Haloperidol => 1.5,
            Medication::Hydralazine => 1.5,
            Medication::Hydrochlorothiazide => 0.8,
            Medication::Hydrocortisone => 1.2,
            Medication::Hydroxyzine => 0.7,
            Medication::Hyoscine => 1.2,
            Medication::Imipramine => 0.8,
            Medication::Indapamide => 0.7,
            Medication::Indoramin => 1.4,
            Medication::Ipratropium => 1.5,
            Medication::Isosorbide => 1.0,
            Medication::Loperamide => 0.9,
            Medication::Loratadine => 0.2,
            Medication::Lorazepam => 1.3,
            Medication::Mebeverine => 1.0,
            Medication::Metoprolol => 1.2,
            Medication::Midazolam => 1.8,
            Medication::Mirtazapine => 1.3,
            Medication::Morphine => 1.5,
            Medication::Nefopam => 1.1,
            Medication::Nifedipine => 1.1,
            Medication::Nortriptyline => 1.0,
            Medication::Olanzapine => 1.5,
            Medication::Oxybutynin => 1.2,
            Medication::Oxycodone => 1.5,
            Medication::Paroxetine => 1.2,
            Medication::Prednisolone => 1.1,
            Medication::Prochlorperazine => 1.0,
            Medication::Procyclidine => 1.5,
            Medication::Promethazine => 0.9,
            Medication::Quetiapine => 1.3,
            Medication::Ranitidine => 1.3,
            Medication::Risperidone => 1.3,
            Medication::Solifenacin => 0.8,
            Medication::Temazepam => 1.2,
            Medication::Theophylline => 1.0,
            Medication::TiotropiumBromide => 1.2,
            Medication::Tolterodine => 1.0,
            Medication::Tramadol => 1.4,
            Medication::Trazodone => 1.0,
            Medication::Trihexyphenidyl => 1.7,
            Medication::TrospiumChloride => 1.3,
            Medication::Umeclidinium => 1.2,
            Medication::Venlafaxine => 1.3,
            Medication::Warfarin => 0.7,
        }
    }
}

/// ACMI inputs: the patient's current anticholinergic medications.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AcmiInput {
    /// Distinct currently-prescribed medications from the 88 scored by the
    /// ACMI. Duplicates are harmless (each medication counts once); a drug
    /// not in this list simply does not contribute to the score (it is not
    /// an error - most prescriptions have no anticholinergic activity).
    pub medications: Vec<Medication>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AcmiOutcome {
    pub score: f64,
    /// Distinct medications that contributed, with their score, sorted by name.
    pub medications: Vec<(Medication, f64)>,
}

fn round1(value: f64) -> f64 {
    let rounded = (value * 10.0).round() / 10.0;
    // `[].iter().sum::<f64>()` is `-0.0` (a documented quirk of f64's `Sum`
    // impl, which folds from a negative-zero seed); normalise so a patient
    // on no anticholinergics gets a plain `0.0`, not a confusing `-0.0`.
    if rounded == 0.0 { 0.0 } else { rounded }
}

pub fn compute(input: &AcmiInput) -> Result<AcmiOutcome, CalcError> {
    let distinct: HashSet<Medication> = input.medications.iter().copied().collect();
    let mut medications: Vec<(Medication, f64)> =
        distinct.into_iter().map(|m| (m, m.acmi_score())).collect();
    medications.sort_by_key(|(m, _)| m.display_name());

    let total: f64 = medications.iter().map(|(_, score)| score).sum();

    Ok(AcmiOutcome {
        score: round1(total),
        medications,
    })
}

pub fn build_response(input: &AcmiInput) -> Result<CalculationResponse, CalcError> {
    let o = compute(input)?;

    let mut working = Map::new();
    working.insert("acmi_score".into(), json!(o.score));
    working.insert("medication_count".into(), json!(o.medications.len()));
    working.insert(
        "medications".into(),
        json!(
            o.medications
                .iter()
                .map(|(m, score)| json!({
                    "medication": m,
                    "name": m.display_name(),
                    "acmi_contribution": score,
                }))
                .collect::<Vec<_>>()
        ),
    );

    let medication_list = if o.medications.is_empty() {
        String::new()
    } else {
        format!(
            ": {}",
            o.medications
                .iter()
                .map(|(m, _)| m.display_name())
                .collect::<Vec<_>>()
                .join(", ")
        )
    };

    let interpretation = format!(
        "ACMI {score:.1} (0-100 scale; 0 means no scored anticholinergic medications currently prescribed, 100 is the hypothetical ceiling for a patient prescribed all 88 scored medications). {count} anticholinergic medication(s) contributed to this score{medication_list}. The ACMI ranks cumulative anticholinergic burden to help prioritise patients for a structured medication review relative to others in a population; it is not a diagnosis, and individual medication scores should not be used alone to decide whether to stop a specific drug - use clinical judgement (Best et al, BMJ Medicine 2026). This score is the anticholinergic burden measure only; it does not include the primary source's separate one-year predicted risk of hospital admission for falls or delirium, which also needs age, sex, frailty, and comorbidity data.",
        score = o.score,
        count = o.medications.len(),
    );

    Ok(CalculationResponse {
        calculator: NAME.to_string(),
        result: json!(o.score),
        interpretation,
        working,
        reference: REFERENCE.to_string(),
    })
}

/// Wire slugs for [`ALL_MEDICATIONS`], in the same order, matching each
/// variant's `#[serde(rename_all = "snake_case")]` name. Kept as a literal
/// list (checked against the enum by `schema_slugs_match_serde_wire_names`)
/// rather than derived at runtime, so building the schema never allocates.
const MEDICATION_SLUGS: &[&str] = &[
    "alverine",
    "amantadine",
    "amisulpride",
    "amitriptyline",
    "aripiprazole",
    "atenolol",
    "atropine",
    "baclofen",
    "bendroflumethiazide",
    "betamethasone",
    "bumetanide",
    "buprenorphine",
    "captopril",
    "carbamazepine",
    "cetirizine",
    "chlorphenamine",
    "chlorpromazine",
    "cimetidine",
    "cinnarizine",
    "citalopram",
    "clomipramine",
    "clonazepam",
    "clonidine",
    "codeine",
    "colchicine",
    "cyclizine",
    "darifenacin",
    "desloratadine",
    "dexamethasone",
    "diazepam",
    "digoxin",
    "dihydrocodeine",
    "dipyridamole",
    "dosulepin",
    "doxazosin",
    "escitalopram",
    "fentanyl",
    "fesoterodine",
    "fexofenadine",
    "fluoxetine",
    "flupentixol",
    "furosemide",
    "glycopyrronium_bromide",
    "haloperidol",
    "hydralazine",
    "hydrochlorothiazide",
    "hydrocortisone",
    "hydroxyzine",
    "hyoscine",
    "imipramine",
    "indapamide",
    "indoramin",
    "ipratropium",
    "isosorbide",
    "loperamide",
    "loratadine",
    "lorazepam",
    "mebeverine",
    "metoprolol",
    "midazolam",
    "mirtazapine",
    "morphine",
    "nefopam",
    "nifedipine",
    "nortriptyline",
    "olanzapine",
    "oxybutynin",
    "oxycodone",
    "paroxetine",
    "prednisolone",
    "prochlorperazine",
    "procyclidine",
    "promethazine",
    "quetiapine",
    "ranitidine",
    "risperidone",
    "solifenacin",
    "temazepam",
    "theophylline",
    "tiotropium_bromide",
    "tolterodine",
    "tramadol",
    "trazodone",
    "trihexyphenidyl",
    "trospium_chloride",
    "umeclidinium",
    "venlafaxine",
    "warfarin",
];

/// Compact ECL expression covering every medication's SNOMED concept(s)
/// (`sct codelist export --format ecl spec/codelists/acmi-medications.codelist`),
/// generated from, and kept in sync with, [`Medication::snomed_ids`].
const MEDICATIONS_SNOMED_ECL: &str = "(<<55452001 OR <<116571008 OR <<116601002 OR <<326557004 OR <<372490001 OR <<372508002 OR <<372518007 OR <<372522002 OR <<372523007 OR <<372570008 OR <<372584003 OR <<372595009 OR <<372596005 OR <<372652004 OR <<372717000 OR <<372718005 OR <<372726002 OR <<372755005 OR <<372756006 OR <<372763006 OR <<372767007 OR <<372805007 OR <<372810006 OR <<372826007 OR <<372829000 OR <<372832002 OR <<372853006 OR <<372856003 OR <<372871004 OR <<372903001 OR <<372914003 OR <<373476007 OR <<373492002 OR <<373529000 OR <<373541007 OR <<386837002 OR <<386840002 OR <<386847004 OR <<386849001 OR <<386850001 OR <<386854005 OR <<386858008 OR <<386884002 OR <<387040009 OR <<387106007 OR <<387120000 OR <<387122008 OR <<387125005 OR <<387160004 OR <<387173000 OR <<387222003 OR <<387247001 OR <<387258005 OR <<387264003 OR <<387300007 OR <<387322000 OR <<387332007 OR <<387342009 OR <<387371005 OR <<387383007 OR <<387409009 OR <<387413002 OR <<387419003 OR <<387461009 OR <<387475002 OR <<387490003 OR <<387491004 OR <<387494007 OR <<387498005 OR <<387506000 OR <<387520007 OR <<387525002 OR <<387567006 OR <<391761004 OR <<395748009 OR <<395955001 OR <<396015008 OR <<396458002 OR <<400447003 OR <<406784005 OR <<407030007 OR <<414047005 OR <<416140008 OR <<418483003 OR <<419768004 OR <<419830007 OR <<425812008 OR <<432255001 OR <<706898002)";

fn input_schema() -> Value {
    let source = json!({
        "citation": REFERENCE,
        "url": "https://doi.org/10.1136/bmjmed-2026-002835"
    });
    json!({
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "AcmiInput",
        "description": "Anticholinergic Medication Index: cumulative anticholinergic burden (0-100) from current anticholinergic prescriptions, weighted by a clinical prediction model for falls and delirium (Best et al, BMJ Medicine 2026). Formulation, brand, dose, and 'as required' (PRN) status are not distinguished, matching the primary model.",
        "type": "object",
        "additionalProperties": false,
        "required": ["medications"],
        "properties": {
            "medications": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": MEDICATION_SLUGS
                },
                "uniqueItems": true,
                "description": "Currently prescribed anticholinergic medications (international non-proprietary names), one entry per distinct drug. A medication not in this list of 88 is not scored by the ACMI, not an error.",
                "definition": {
                    "concept": "Current anticholinergic prescription (ACMI medication list)",
                    "statement": "The patient currently holds a prescription for one or more of the 88 ingredient-level substances scored by the ACMI. Each enum value maps to a specific SNOMED CT substance concept, verified against the NHS dm+d ingredient simple reference set (999000791000001109) with the `sct` toolchain.",
                    "excludes": [
                        "Any substance not among these 88, even if it has anticholinergic properties on another scale - for example, most of the anticholinergic cognitive burden scale's medications that do not overlap with ACMI's list do NOT count here",
                        "Historical or discontinued prescriptions - this reflects current medication use"
                    ],
                    "source": source,
                    "snomedEcl": MEDICATIONS_SNOMED_ECL,
                    "refset": "999000791000001109 |NHS dm+d (dictionary of medicines and devices) ingredient simple reference set|",
                    "caveats": "The governed, per-medication mapping (including provenance) is spec/codelists/acmi-medications.codelist. Isosorbide is listed in the primary source without specifying an ester, so both the mononitrate and dinitrate concepts are included pending disambiguation - this is a primary-source ambiguity, not a terminology-binding error. Verified against SNOMED CT UK edition 2026-09-23; revalidate periodically as the edition advances.",
                    "status": "draft"
                }
            }
        }
    })
}

pub struct Acmi;

impl Calculator for Acmi {
    fn name(&self) -> &'static str {
        NAME
    }

    fn title(&self) -> &'static str {
        "Anticholinergic Medication Index (ACMI)"
    }

    fn description(&self) -> &'static str {
        "Cumulative anticholinergic burden (0-100) from current prescriptions, weighted by a clinical prediction model for falls and delirium in adults aged over 65."
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
        let parsed: AcmiInput = serde_json::from_value(input.clone())
            .map_err(|e| CalcError::InvalidInput(e.to_string()))?;
        build_response(&parsed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(medications: &[Medication]) -> AcmiInput {
        AcmiInput {
            medications: medications.to_vec(),
        }
    }

    #[test]
    fn no_medications_scores_zero() {
        let o = compute(&input(&[])).unwrap();
        assert_eq!(o.score, 0.0);
        assert!(!o.score.is_sign_negative(), "must not be -0.0");
        assert!(o.medications.is_empty());
    }

    #[test]
    fn single_medication_matches_published_score() {
        let o = compute(&input(&[Medication::Amantadine])).unwrap();
        assert_eq!(o.score, 2.3);

        let o = compute(&input(&[Medication::Desloratadine])).unwrap();
        assert_eq!(o.score, 0.1);
    }

    #[test]
    fn score_is_the_sum_of_distinct_medications() {
        let o = compute(&input(&[
            Medication::Amantadine,
            Medication::Codeine,
            Medication::Furosemide,
        ]))
        .unwrap();
        // 2.3 + 1.3 + 1.1
        assert!((o.score - 4.7).abs() < 1e-9);
    }

    #[test]
    fn duplicate_medications_count_once() {
        let once = compute(&input(&[Medication::Amantadine])).unwrap();
        let twice = compute(&input(&[Medication::Amantadine, Medication::Amantadine])).unwrap();
        assert_eq!(once.score, twice.score);
        assert_eq!(twice.medications.len(), 1);
    }

    #[test]
    fn every_medication_is_scored_between_zero_and_two_point_three() {
        for medication in ALL_MEDICATIONS {
            let score = medication.acmi_score();
            assert!(
                (0.0..=2.3).contains(&score),
                "{}: {score} out of published range",
                medication.display_name()
            );
        }
    }

    #[test]
    fn all_88_medications_sum_to_approximately_the_published_ceiling() {
        // The authors designed the scale so a hypothetical patient on all
        // 88 medications scores 100; summing the individually rounded
        // published scores lands within the rounding error of that ceiling.
        let total: f64 = ALL_MEDICATIONS.iter().map(|m| m.acmi_score()).sum();
        assert_eq!(ALL_MEDICATIONS.len(), 88);
        assert!(
            (98.0..=100.5).contains(&total),
            "sum of all published ACMI scores was {total}, expected close to 100"
        );
    }

    #[test]
    fn dynamic_calculate_matches_typed() {
        let value = json!({
            "medications": ["amantadine", "codeine", "furosemide"]
        });
        let dynamic = Acmi.calculate(&value).unwrap();
        let typed = build_response(&input(&[
            Medication::Amantadine,
            Medication::Codeine,
            Medication::Furosemide,
        ]))
        .unwrap();
        assert_eq!(dynamic, typed);
        assert_eq!(dynamic.result, json!(4.7));
    }

    #[test]
    fn rejects_unknown_medication_name() {
        let value = json!({ "medications": ["ibuprofen"] });
        assert!(Acmi.calculate(&value).is_err());
    }

    #[test]
    fn rejects_unknown_fields() {
        let value = json!({ "medications": [], "dose": "high" });
        assert!(Acmi.calculate(&value).is_err());
    }

    /// The governed codelist (`spec/codelists/acmi-medications.codelist`,
    /// validated separately with `sct codelist validate`) and the Rust
    /// `snomed_ids()` match must never drift apart silently.
    const ACMI_CODELIST: &str = include_str!("../../spec/codelists/acmi-medications.codelist");

    fn codelist_sctids() -> HashSet<u64> {
        ACMI_CODELIST
            .lines()
            .filter_map(|line| line.split_whitespace().next())
            .filter(|token| token.chars().all(|c| c.is_ascii_digit()))
            .map(|token| token.parse().unwrap())
            .collect()
    }

    #[test]
    fn every_snomed_id_is_in_the_governed_codelist() {
        let codelist_ids = codelist_sctids();
        assert_eq!(
            codelist_ids.len(),
            89,
            "expected 89 concepts (88 medications, Isosorbide covering two esters)"
        );
        for medication in ALL_MEDICATIONS {
            for id in medication.snomed_ids() {
                assert!(
                    codelist_ids.contains(id),
                    "{}: SNOMED id {id} is not in spec/codelists/acmi-medications.codelist",
                    medication.display_name()
                );
            }
        }
    }

    #[test]
    fn codelist_has_no_ids_unused_by_any_medication() {
        let used: HashSet<u64> = ALL_MEDICATIONS
            .iter()
            .flat_map(|m| m.snomed_ids().iter().copied())
            .collect();
        let codelist_ids = codelist_sctids();
        let unused: Vec<_> = codelist_ids.difference(&used).collect();
        assert!(
            unused.is_empty(),
            "codelist has SNOMED ids not referenced by any Medication: {unused:?}"
        );
    }

    #[test]
    fn every_snomed_id_appears_in_the_ecl_expression() {
        for medication in ALL_MEDICATIONS {
            for id in medication.snomed_ids() {
                let needle = format!("<<{id}");
                assert!(
                    MEDICATIONS_SNOMED_ECL.contains(&needle),
                    "{}: SNOMED id {id} missing from MEDICATIONS_SNOMED_ECL",
                    medication.display_name()
                );
            }
        }
    }

    #[test]
    fn schema_slugs_match_serde_wire_names() {
        assert_eq!(MEDICATION_SLUGS.len(), ALL_MEDICATIONS.len());
        for (medication, slug) in ALL_MEDICATIONS.iter().zip(MEDICATION_SLUGS) {
            assert_eq!(
                serde_json::to_value(medication).unwrap(),
                json!(slug),
                "{}: literal slug does not match its serde wire name",
                medication.display_name()
            );
        }
    }

    #[test]
    fn schema_lists_all_88_medications() {
        let schema = Acmi.input_schema();
        let enum_values = schema["properties"]["medications"]["items"]["enum"]
            .as_array()
            .unwrap();
        assert_eq!(enum_values.len(), 88);
        assert!(enum_values.contains(&json!("amantadine")));
        assert!(enum_values.contains(&json!("glycopyrronium_bromide")));
    }

    #[test]
    fn response_lists_contributing_medications_sorted_by_name() {
        let response =
            build_response(&input(&[Medication::Warfarin, Medication::Amantadine])).unwrap();
        let medications = response.working["medications"].as_array().unwrap();
        assert_eq!(medications.len(), 2);
        assert_eq!(medications[0]["name"], json!("Amantadine"));
        assert_eq!(medications[1]["name"], json!("Warfarin"));
        assert!(response.interpretation.contains("Amantadine"));
        assert!(response.interpretation.contains("Warfarin"));
    }
}
