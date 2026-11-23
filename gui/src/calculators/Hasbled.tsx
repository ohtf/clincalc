// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ScoreTile,
  YesNoField,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** HAS-BLED one-year major bleeding risk in atrial fibrillation (Pisters 2010). */

const CRITERIA = [
  {
    key: "hypertension_uncontrolled",
    label: "H - Uncontrolled hypertension (+1)",
    summary: "Uncontrolled hypertension (systolic BP above 160 mmHg)",
    hint: "Systolic BP above 160 mmHg. Controlled or merely treated hypertension does not score.",
  },
  {
    key: "abnormal_renal_function",
    label: "A - Abnormal renal function (+1)",
    summary: "Abnormal renal function",
    hint: "Chronic dialysis, renal transplant, or serum creatinine 200 µmol/L or above.",
  },
  {
    key: "abnormal_liver_function",
    label: "A - Abnormal liver function (+1)",
    summary: "Abnormal liver function",
    hint: "Cirrhosis, or bilirubin above 2x ULN with AST/ALT/ALP above 3x ULN.",
  },
  {
    key: "stroke",
    label: "S - Prior stroke (+1)",
    summary: "Prior stroke",
    hint: "Prior ischaemic or haemorrhagic stroke. TIA without infarction is generally not counted.",
  },
  {
    key: "bleeding_history",
    label: "B - Bleeding history or predisposition (+1)",
    summary: "Bleeding history or predisposition",
    hint: "Prior major bleed, bleeding diathesis, or anaemia.",
  },
  {
    key: "labile_inr",
    label: "L - Labile INR (+1)",
    summary: "Labile INR",
    hint: "On a vitamin K antagonist: unstable or high INRs, or time in therapeutic range below 60%. Not applicable on a DOAC.",
  },
  {
    key: "elderly_over_65",
    label: "E - Elderly, over 65 years (+1)",
    summary: "Age over 65 years",
    hint: "Age 66 and over.",
  },
  {
    key: "drugs_antiplatelet_nsaid",
    label: "D - Antiplatelet or NSAID use (+1)",
    summary: "Concomitant antiplatelet or NSAID use",
    hint: "Concomitant aspirin, clopidogrel or other antiplatelet, or NSAID - not the anticoagulant itself.",
  },
  {
    key: "alcohol_excess",
    label: "D - Harmful alcohol use (+1)",
    summary: "Harmful alcohol use (8 or more units per week)",
    hint: "8 or more units (drinks) per week.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const BAND_COLOUR: Record<string, string> = { low: "teal", high: "red" };

function HasbledCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);

  const calc = useCalculation("hasbled", criteria);

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="HAS-BLED"
      badge="Atrial fibrillation"
      description="One-year major bleeding risk in atrial fibrillation on anticoagulation (Pisters 2010), weighed against stroke risk per NICE NG196. A high score flags modifiable risk factors; it does not by itself contraindicate anticoagulation."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that applies"
      calc={calc}
      form={
        <>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={9}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      summary={(r) => {
        const present = CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary);
        return summaryText({
          heading: `HAS-BLED score ${fmt(r.result)} / 9 (${asText(r.working.risk)} bleeding risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: present,
          extra: [present.length === 0 && "No HAS-BLED criteria present."],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "hasbled", Component: HasbledCalculator };
