// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid } from "@mantine/core";
import { IconTestPipe } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** ISTH overt DIC score, 2025 update (Iba, J Thromb Haemost 2025). */

type Etiology =
  | "sepsis_or_severe_infection"
  | "malignancy"
  | "major_trauma_or_tissue_injury"
  | "obstetric_complication"
  | "vascular_abnormality"
  | "severe_immunological_or_toxic_reaction"
  | "heat_stroke"
  | "post_cardiopulmonary_resuscitation"
  | "other_clinician_confirmed_dic_associated_etiology";

const ETIOLOGY: Choice<Etiology>[] = [
  { value: "sepsis_or_severe_infection", label: "Sepsis or severe infection" },
  { value: "malignancy", label: "Malignancy" },
  { value: "major_trauma_or_tissue_injury", label: "Major trauma or tissue injury" },
  {
    value: "obstetric_complication",
    label: "Obstetric complication",
    hint: "Physiological D-dimer and fibrinogen changes in pregnancy can alter this score; pregnancy-specific criteria are preferable where available.",
  },
  { value: "vascular_abnormality", label: "Vascular abnormality" },
  {
    value: "severe_immunological_or_toxic_reaction",
    label: "Severe immunological or toxic reaction",
  },
  { value: "heat_stroke", label: "Heat stroke" },
  { value: "post_cardiopulmonary_resuscitation", label: "Following cardiopulmonary resuscitation" },
  {
    value: "other_clinician_confirmed_dic_associated_etiology",
    label: "Other disorder confirmed as a recognised cause of DIC",
  },
];

const ZERO_MIN = { min: 0 };

const BAND_LABEL: Record<string, string> = {
  consistent_with_overt_dic: "consistent with overt DIC",
  below_overt_dic_threshold: "below overt DIC threshold",
};
const BAND_COLOUR: Record<string, string> = {
  consistent_with_overt_dic: "red",
  below_overt_dic_threshold: "teal",
};

function IsthOvertDicCalculator() {
  const [etiology, setEtiology] = useState<Etiology | null>(null);
  const [platelets, setPlatelets] = useState<number | null>(null);
  const [dDimer, setDDimer] = useState<number | null>(null);
  const [pt, setPt] = useState<number | null>(null);
  const [fibrinogen, setFibrinogen] = useState<number | null>(null);

  const complete =
    etiology !== null &&
    inRange(platelets, ZERO_MIN.min) &&
    inRange(dDimer, ZERO_MIN.min) &&
    inRange(pt, ZERO_MIN.min) &&
    inRange(fibrinogen, ZERO_MIN.min);
  const calc = useCalculation(
    "isth_overt_dic",
    complete
      ? {
          underlying_etiology: etiology,
          platelet_count_10_9_l: platelets,
          d_dimer_multiple_of_uln: dDimer,
          pt_prolongation_seconds: pt,
          fibrinogen_g_l: fibrinogen,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconTestPipe}
      title="ISTH overt DIC score (2025)"
      badge="Coagulopathy"
      description="Overt (late-phase) disseminated intravascular coagulation in a patient with a confirmed underlying disorder known to cause DIC; 5 or more out of 8 is consistent with overt DIC (Iba 2025). It does not exclude early-phase DIC or select treatment."
      onReset={() => {
        setEtiology(null);
        setPlatelets(null);
        setDDimer(null);
        setPt(null);
        setFibrinogen(null);
      }}
      calc={calc}
      incomplete="Choose the underlying disorder and enter all four laboratory values to calculate."
      form={
        <>
          <ChoiceField
            label="Underlying disorder known to cause DIC"
            hint="Clinician-confirmed. The score does not apply to unexplained abnormal coagulation tests or a merely suspected cause."
            value={etiology}
            onChange={setEtiology}
            options={ETIOLOGY}
          />
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Platelet count"
              hint="Under 50 scores 2; 50 to under 100 scores 1."
              unit="x10⁹/L"
              value={platelets}
              onChange={setPlatelets}
              min={ZERO_MIN.min}
              decimals={0}
            />
            <NumberField
              label="D-dimer, multiple of ULN"
              hint="Patient D-dimer divided by the same assay's upper limit of normal, in the same units. Over 3 to 7 scores 2; over 7 scores 3."
              unit="x ULN"
              value={dDimer}
              onChange={setDDimer}
              min={ZERO_MIN.min}
              decimals={2}
            />
            <NumberField
              label="PT prolongation"
              hint="Seconds above the local control or upper normal value (not absolute PT or INR). 3 to under 6 scores 1; 6 or more scores 2."
              unit="seconds"
              value={pt}
              onChange={setPt}
              min={ZERO_MIN.min}
              decimals={1}
            />
            <NumberField
              label="Fibrinogen (functional)"
              hint="Under 1.0 g/L scores 1. 100 mg/dL equals 1 g/L."
              unit="g/L"
              value={fibrinogen}
              onChange={setFibrinogen}
              min={ZERO_MIN.min}
              decimals={2}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const band = asText(r.working.band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={8}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={BAND_LABEL[band] ?? band}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["Platelets", fmt(r.working.platelet_count_points)],
            ["D-dimer", fmt(r.working.d_dimer_points)],
            ["PT prolongation", fmt(r.working.pt_prolongation_points)],
            ["Fibrinogen", fmt(r.working.fibrinogen_points)],
          ]}
        />
      )}
      summary={(r) => {
        const band = asText(r.working.band);
        return summaryText({
          heading: `ISTH overt DIC score (2025) ${fmt(r.result)} / 8 (${BAND_LABEL[band] ?? band})`,
          interpretation: r.interpretation,
          findingsTitle: "Values",
          findings: [
            `Underlying disorder: ${ETIOLOGY.find((e) => e.value === etiology)?.label ?? ""}`,
            `Platelet count ${fmt(platelets)} x10⁹/L (${fmt(r.working.platelet_count_points)})`,
            `D-dimer ${fmt(dDimer, 2)} x ULN (${fmt(r.working.d_dimer_points)})`,
            `PT prolonged by ${fmt(pt)} seconds (${fmt(r.working.pt_prolongation_points)})`,
            `Fibrinogen ${fmt(fibrinogen, 2)} g/L (${fmt(r.working.fibrinogen_points)})`,
          ],
          extra: [asText(r.working.limitations)],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "isth_overt_dic",
  Component: IsthOvertDicCalculator,
};
