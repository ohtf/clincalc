// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconFlask2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** HOMA-IR, the original HOMA1 insulin-resistance estimate (Matthews, Diabetologia 1985). */

type GlucoseUnit = "mmol/L" | "mg/dL";

const GLUCOSE_UNITS: Choice<GlucoseUnit>[] = [
  { value: "mmol/L", label: "mmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

const GLUCOSE: Record<GlucoseUnit, { min: number; max: number }> = {
  "mmol/L": { min: 1.7, max: 27.8 },
  "mg/dL": { min: 30, max: 500 },
};
const INSULIN = { min: 0.5, max: 300 };

const fixed2 = (v: unknown) => asNumber(v)?.toFixed(2) ?? asText(v);

function HomaIrCalculator() {
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit | null>(null);
  const [glucose, setGlucose] = useState<number | null>(null);
  const [insulin, setInsulin] = useState<number | null>(null);

  const complete =
    glucoseUnit !== null &&
    inRange(glucose, GLUCOSE[glucoseUnit].min, GLUCOSE[glucoseUnit].max) &&
    inRange(insulin, INSULIN.min, INSULIN.max);
  const calc = useCalculation(
    "homa_ir",
    complete
      ? { fasting_glucose: glucose, glucose_unit: glucoseUnit, fasting_insulin_miu_l: insulin }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlask2}
      title="HOMA-IR"
      badge="Insulin resistance"
      description="Homeostasis model assessment of insulin resistance from fasting glucose and insulin (original HOMA1, Matthews 1985). A continuous estimate with no universal diagnostic cut-off; values depend on the insulin assay and population. Not for people receiving exogenous insulin."
      onReset={() => {
        setGlucoseUnit(null);
        setGlucose(null);
        setInsulin(null);
      }}
      calc={calc}
      incomplete="Choose the glucose unit, then enter fasting glucose and insulin."
      form={
        <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
          <ChoiceField layout="inline"
            label="Glucose unit"
            hint="mg/dL is converted at 18 mg/dL per mmol/L."
            value={glucoseUnit}
            onChange={setGlucoseUnit}
            options={GLUCOSE_UNITS}
          />
          <NumberField
            label="Fasting plasma glucose"
            hint={
              glucoseUnit === null ? "Choose the unit first." : "Same fasting sample as insulin."
            }
            unit={glucoseUnit ?? undefined}
            value={glucose}
            onChange={setGlucose}
            min={glucoseUnit ? GLUCOSE[glucoseUnit].min : undefined}
            max={glucoseUnit ? GLUCOSE[glucoseUnit].max : undefined}
          />
          <NumberField
            label="Fasting insulin"
            hint="Same fasting sample as glucose. mIU/L is numerically equal to µU/mL."
            unit="mIU/L"
            value={insulin}
            onChange={setInsulin}
            min={INSULIN.min}
            max={INSULIN.max}
          />
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={fixed2(r.result)} badge="HOMA-IR" />}
      details={(r) => (
        <Facts
          items={[["Fasting glucose", `${fmt(r.working.fasting_glucose_mmol_l, 2)} mmol/L`]]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `HOMA-IR ${fixed2(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Fasting sample",
          findings: [`Glucose ${glucose} ${glucoseUnit}`, `Insulin ${insulin} mIU/L`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "homa_ir", Component: HomaIrCalculator };
