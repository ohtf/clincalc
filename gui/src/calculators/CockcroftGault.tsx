// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconPill } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Cockcroft-Gault creatinine clearance (Cockcroft & Gault 1976). */

type Sex = "male" | "female";
type Unit = "umol/L" | "mg/dL";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female", hint: "Applies a 0.85 multiplier." },
];

const UNITS: Choice<Unit>[] = [
  { value: "umol/L", label: "µmol/L", hint: "UK laboratories." },
  { value: "mg/dL", label: "mg/dL" },
];

const UNIT_TEXT: Record<Unit, string> = { "umol/L": "µmol/L", "mg/dL": "mg/dL" };

const AGE = { min: 18, max: 120 };

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function CockcroftGaultCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    positive(weight) &&
    sex !== null &&
    positive(creatinine) &&
    unit !== null;
  const calc = useCalculation(
    "cockcroft_gault",
    complete ? { age, weight_kg: weight, sex, creatinine, creatinine_unit: unit } : null,
  );

  return (
    <CalculatorPage
      icon={IconPill}
      title="Cockcroft-Gault"
      badge="Renal drug dosing"
      description="Creatinine clearance in mL/min from age, weight, sex, and serum creatinine (Cockcroft & Gault 1976). Still used for renal drug dosing where the drug guidance cites CrCl; superseded by CKD-EPI 2021 eGFR for CKD staging. For adults 18 and over."
      onReset={() => {
        setAge(null);
        setWeight(null);
        setSex(null);
        setCreatinine(null);
        setUnit(null);
      }}
      calc={calc}
      incomplete="Enter age, weight, sex, and creatinine with its unit to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
          </SimpleGrid>
          <NumberField
            label="Weight"
            hint="Use actual body weight for most patients. In obesity (actual weight more than 1.3 × ideal body weight) many pharmacokinetic guidelines recommend ideal or adjusted body weight; the right choice is drug-specific."
            unit="kg"
            value={weight}
            onChange={setWeight}
            min={0}
            decimals={1}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Serum creatinine"
              unit={unit ? UNIT_TEXT[unit] : undefined}
              value={creatinine}
              onChange={setCreatinine}
              min={0}
              decimals={unit === "mg/dL" ? 2 : 1}
            />
            <ChoiceField
              label="Creatinine unit"
              hint="1 mg/dL = 88.4 µmol/L."
              value={unit}
              onChange={setUnit}
              options={UNITS}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} unit="mL/min" badge="CrCl" />}
      details={(r) => (
        <Facts
          items={[
            ["Creatinine used", `${fmt(r.working.scr_mgdl_used, 3)} mg/dL`],
            ["Sex factor", fmt(r.working.sex_factor, 2)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Cockcroft-Gault creatinine clearance ${fmt(r.result)} mL/min`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age ${age} years`,
            `Weight ${weight} kg`,
            `Sex: ${sex}`,
            `Serum creatinine ${creatinine} ${unit ? UNIT_TEXT[unit] : ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "cockcroft_gault",
  Component: CockcroftGaultCalculator,
};
