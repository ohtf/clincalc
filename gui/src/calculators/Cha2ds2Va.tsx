// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import {
  CalculatorPage,
  inRange,
  NumberField,
  ScoreTile,
  YesNoField,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** CHA2DS2-VA stroke risk in atrial fibrillation (2024 ESC AF Guidelines, Van Gelder 2024). */

const CRITERIA = [
  {
    key: "congestive_heart_failure",
    label: "Congestive heart failure (+1)",
    summary: "Congestive heart failure or LVEF below 40%",
    hint: "Heart failure, or LVEF below 40%.",
  },
  {
    key: "hypertension",
    label: "Hypertension (+1)",
    summary: "Hypertension",
    hint: "Treated, or resting BP above 140/90 mmHg on two occasions.",
  },
  {
    key: "diabetes",
    label: "Diabetes mellitus (+1)",
    summary: "Diabetes mellitus",
  },
  {
    key: "stroke_tia_thromboembolism",
    label: "Prior stroke, TIA, or thromboembolism (+2)",
    summary: "Prior stroke, TIA, or systemic thromboembolism",
    hint: "Prior stroke, transient ischaemic attack, or systemic thromboembolism.",
  },
  {
    key: "vascular_disease",
    label: "Vascular disease (+1)",
    summary: "Vascular disease",
    hint: "Prior myocardial infarction, peripheral artery disease, or aortic plaque.",
  },
] as const;

type Key = (typeof CRITERIA)[number]["key"];
type Criteria = Record<Key, boolean>;

const AGE = { min: 18, max: 120 };
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

function Cha2ds2VaCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const [age, setAge] = useState<number | null>(null);

  const complete = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const calc = useCalculation("cha2ds2_va", complete ? { age, ...criteria } : null);

  return (
    <CalculatorPage
      icon={IconBrain}
      title="CHA₂DS₂-VA"
      badge="Atrial fibrillation"
      description="Stroke risk in atrial fibrillation using the 2024 ESC sex-free update of CHA₂DS₂-VASc (score 0-8). Female sex is no longer a risk modifier."
      onReset={() => {
        setCriteria(noneTicked());
        setAge(null);
      }}
      formTitle="Tick each criterion that applies"
      calc={calc}
      incomplete="Enter the patient's age to calculate."
      form={
        <>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={"hint" in c ? c.hint : undefined}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
          <Divider />
          <NumberField
            label="Age"
            hint="65-74 scores 1, 75 or over scores 2."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} outOf={8} />}
      summary={(r) =>
        summaryText({
          heading: `CHA₂DS₂-VA score ${fmt(r.result)} / 8`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: [
            ...CRITERIA.filter((c) => criteria[c.key]).map((c) => c.summary),
            `Age ${age} years`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "cha2ds2_va", Component: Cha2ds2VaCalculator };
