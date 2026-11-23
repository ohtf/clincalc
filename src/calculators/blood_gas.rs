// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

use serde_json::{Map, Value, json};

use crate::calculator::CalcError;

// Conventional mmHg = 133.322387415 Pa (NIST SP 811, Appendix B.8).
pub(super) const MMHG_PER_KPA: f64 = 1000.0 / 133.322_387_415;

pub(super) fn convert_kpa(
    input: &mut Map<String, Value>,
    kpa_key: &str,
    mmhg_key: &str,
    min_mmhg: f64,
    max_mmhg: f64,
) -> Result<(), CalcError> {
    if let Some(value) = input.remove(kpa_key) {
        if input.contains_key(mmhg_key) {
            return Err(CalcError::InvalidInput(
                "Supply each blood gas pressure only once, in kPa or mmHg".into(),
            ));
        }
        let kpa = value
            .as_f64()
            .ok_or_else(|| CalcError::InvalidInput(format!("{kpa_key} must be numeric")))?;
        if !(min_mmhg / MMHG_PER_KPA..=max_mmhg / MMHG_PER_KPA).contains(&kpa) {
            return Err(CalcError::InvalidInput(format!(
                "{kpa_key} is outside the supported pressure range"
            )));
        }
        // Clamp only binary rounding at the inclusive conversion boundaries.
        let mmhg = (kpa * MMHG_PER_KPA).clamp(min_mmhg, max_mmhg);
        input.insert(mmhg_key.into(), json!(mmhg));
    }
    Ok(())
}
