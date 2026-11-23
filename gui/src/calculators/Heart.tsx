// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconHeartbeat } from "@tabler/icons-react";

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

/** HEART score for chest pain in the ED (Six 2008; Backus 2013). */

type History = "slightly_suspicious" | "moderately_suspicious" | "highly_suspicious";
type Ecg = "normal" | "non_specific_repolarisation" | "significant_st_deviation";
type RiskFactors = "none" | "one_or_two" | "three_or_more_or_atherosclerosis";
type Troponin = "normal" | "one_to_three_times" | "over_three_times";

const HISTORY: Choice<History>[] = [
  { value: "slightly_suspicious", label: "Slightly suspicious (0)" },
  { value: "moderately_suspicious", label: "Moderately suspicious (1)" },
  { value: "highly_suspicious", label: "Highly suspicious (2)" },
];

const ECG: Choice<Ecg>[] = [
  { value: "normal", label: "Normal (0)" },
  {
    value: "non_specific_repolarisation",
    label: "Non-specific repolarisation disturbance (1)",
    hint: "e.g. LBBB, LVH, digoxin effect, or unchanged repolarisation changes.",
  },
  {
    value: "significant_st_deviation",
    label: "Significant ST deviation (2)",
    hint: "ST deviation not explained by LBBB, LVH, or digoxin.",
  },
];

const RISK_FACTORS: Choice<RiskFactors>[] = [
  { value: "none", label: "None known (0)" },
  { value: "one_or_two", label: "One or two risk factors (1)" },
  {
    value: "three_or_more_or_atherosclerosis",
    label: "Three or more, or known atherosclerotic disease (2)",
    hint: "Atherosclerotic disease: prior MI, PCI/CABG, stroke/TIA, or peripheral arterial disease.",
  },
];

const TROPONIN: Choice<Troponin>[] = [
  { value: "normal", label: "At or below the normal limit (0)" },
  { value: "one_to_three_times", label: "1-3 times the normal limit (1)" },
  { value: "over_three_times", label: "More than 3 times the normal limit (2)" },
];

const AGE = { min: 18, max: 120 };

const BAND_COLOUR: Record<string, string> = { low: "teal", moderate: "yellow", high: "red" };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function HeartCalculator() {
  const [history, setHistory] = useState<History | null>(null);
  const [ecg, setEcg] = useState<Ecg | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactors | null>(null);
  const [troponin, setTroponin] = useState<Troponin | null>(null);

  const complete =
    history !== null &&
    ecg !== null &&
    riskFactors !== null &&
    troponin !== null &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age);
  const calc = useCalculation(
    "heart",
    complete ? { history, ecg, age, risk_factors: riskFactors, troponin } : null,
  );

  return (
    <CalculatorPage
      icon={IconHeartbeat}
      title="HEART score"
      badge="Chest pain in the ED"
      description="Six-week risk of major adverse cardiac events in adults presenting to the emergency department with chest pain (Six 2008; validated by Backus 2013)."
      onReset={() => {
        setHistory(null);
        setEcg(null);
        setAge(null);
        setRiskFactors(null);
        setTroponin(null);
      }}
      calc={calc}
      incomplete="Answer all five components to calculate."
      form={
        <>
          <ChoiceField label="History" value={history} onChange={setHistory} options={HISTORY} />
          <ChoiceField label="ECG" value={ecg} onChange={setEcg} options={ECG} />
          <NumberField
            label="Age"
            hint="Under 45 scores 0, 45-64 scores 1, 65 or over scores 2."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <ChoiceField
            label="Risk factors"
            hint="Hypertension, hypercholesterolaemia, diabetes, obesity (BMI over 30), current or recent smoking, family history."
            value={riskFactors}
            onChange={setRiskFactors}
            options={RISK_FACTORS}
          />
          <ChoiceField
            label="Initial troponin"
            hint="Relative to the local assay's normal limit."
            value={troponin}
            onChange={setTroponin}
            options={TROPONIN}
          />
        </>
      }
      result={(r) => {
        const band = asText(r.working.risk_band);
        return (
          <ScoreTile
            value={fmt(r.result)}
            outOf={10}
            colour={BAND_COLOUR[band] ?? "teal"}
            badge={band && `${band} risk`}
          />
        );
      }}
      details={(r) => (
        <Facts
          title="Points"
          items={[
            ["History", fmt(r.working.history)],
            ["ECG", fmt(r.working.ecg)],
            ["Age", fmt(r.working.age)],
            ["Risk factors", fmt(r.working.risk_factors)],
            ["Troponin", fmt(r.working.troponin)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `HEART score ${fmt(r.result)} / 10 (${asText(r.working.risk_band)} risk)`,
          interpretation: r.interpretation,
          findingsTitle: "Components",
          findings: [
            `History: ${labelOf(HISTORY, history)}`,
            `ECG: ${labelOf(ECG, ecg)}`,
            `Age: ${age} (${fmt(r.working.age)})`,
            `Risk factors: ${labelOf(RISK_FACTORS, riskFactors)}`,
            `Troponin: ${labelOf(TROPONIN, troponin)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "heart", Component: HeartCalculator };
