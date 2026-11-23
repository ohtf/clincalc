// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDroplet } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
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

/** eGFR by the race-free CKD-EPI 2021 creatinine equation (Inker 2021). */

type Sex = "male" | "female";
type Unit = "umol/L" | "mg/dL";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const UNITS: Choice<Unit>[] = [
  { value: "umol/L", label: "µmol/L", hint: "UK laboratories." },
  { value: "mg/dL", label: "mg/dL" },
];

const UNIT_TEXT: Record<Unit, string> = { "umol/L": "µmol/L", "mg/dL": "mg/dL" };

const AGE = { min: 18, max: 120 };

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function EgfrCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [creatinine, setCreatinine] = useState<number | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    sex !== null &&
    positive(creatinine) &&
    unit !== null;
  const calc = useCalculation(
    "egfr",
    complete ? { age, sex, creatinine, creatinine_unit: unit } : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplet}
      title="eGFR (CKD-EPI 2021)"
      badge="Kidney function"
      description="Estimated glomerular filtration rate from serum creatinine by the race-free CKD-EPI 2021 equation (Inker 2021), with the CKD G-stage. For adults 18 and over."
      onReset={() => {
        setAge(null);
        setSex(null);
        setCreatinine(null);
        setUnit(null);
      }}
      calc={calc}
      incomplete="Enter age, sex, and creatinine with its unit to calculate."
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
            <ChoiceField
              label="Sex"
              hint="Selects the equation's creatinine coefficients."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
          </SimpleGrid>
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
              hint="A wrong unit changes the result about 88-fold."
              value={unit}
              onChange={setUnit}
              options={UNITS}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mL/min/1.73m²"
          badge={asText(r.working.ckd_g_stage) && `Stage ${asText(r.working.ckd_g_stage)}`}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `eGFR ${fmt(r.result)} mL/min/1.73m² (CKD-EPI 2021; G-stage ${asText(r.working.ckd_g_stage)})`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Age ${age} years`,
            `Sex: ${sex}`,
            `Serum creatinine ${creatinine} ${unit ? UNIT_TEXT[unit] : ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "egfr", Component: EgfrCalculator };
