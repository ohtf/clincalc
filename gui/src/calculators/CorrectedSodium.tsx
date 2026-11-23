// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDropletHalf } from "@tabler/icons-react";

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

/** Hyperglycaemia-corrected sodium (Katz, NEJM 1973; Hillier, Am J Med 1999). */

type GlucoseUnit = "mmol/L" | "mg/dL";
type Method = "katz" | "hillier";

const GLUCOSE_UNITS: Choice<GlucoseUnit>[] = [
  { value: "mmol/L", label: "mmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];

// The engine's bound is 100-2500 mg/dL; in mmol/L that is 5.5506-138.7655, rounded inwards here.
const GLUCOSE: Record<GlucoseUnit, { min: number; max: number }> = {
  "mmol/L": { min: 5.56, max: 138.76 },
  "mg/dL": { min: 100, max: 2500 },
};
const SODIUM = { min: 80, max: 200 };

const METHODS: Choice<Method>[] = [
  {
    value: "katz",
    label: "Katz (1.6 mmol/L per 100 mg/dL glucose above 100 mg/dL)",
    hint: "Katz 1973.",
  },
  {
    value: "hillier",
    label: "Hillier (2.4 mmol/L per 100 mg/dL glucose above 100 mg/dL)",
    hint: "Hillier 1999: the better overall linear estimate. This uses the single 2.4 factor, not the 4.0 factor Hillier found fitted better above 400 mg/dL.",
  },
];

const METHOD_NAME: Record<string, string> = { katz: "Katz", hillier: "Hillier" };
const methodName = (v: unknown) => METHOD_NAME[asText(v)] ?? asText(v);

function CorrectedSodiumCalculator() {
  const [sodium, setSodium] = useState<number | null>(null);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit | null>(null);
  const [glucose, setGlucose] = useState<number | null>(null);
  const [method, setMethod] = useState<Method | null>(null);

  const complete =
    method !== null &&
    glucoseUnit !== null &&
    inRange(sodium, SODIUM.min, SODIUM.max) &&
    inRange(glucose, GLUCOSE[glucoseUnit].min, GLUCOSE[glucoseUnit].max);
  const calc = useCalculation(
    "corrected_sodium",
    complete ? { sodium, glucose, glucose_unit: glucoseUnit, method } : null,
  );

  return (
    <CalculatorPage
      icon={IconDropletHalf}
      title="Corrected sodium"
      badge="Hyperglycaemia"
      description="Estimated sodium once glucose normalises, for DKA and HHS work-up: a corrected value that is still low suggests true hyponatraemia (Katz 1973; Hillier 1999). Not valid below normoglycaemia."
      onReset={() => {
        setSodium(null);
        setGlucoseUnit(null);
        setGlucose(null);
        setMethod(null);
      }}
      calc={calc}
      incomplete="Enter sodium and glucose, and choose the glucose unit and the correction factor."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Measured sodium"
              unit="mmol/L"
              value={sodium}
              onChange={setSodium}
              min={SODIUM.min}
              max={SODIUM.max}
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField layout="inline"
              label="Glucose unit"
              value={glucoseUnit}
              onChange={setGlucoseUnit}
              options={GLUCOSE_UNITS}
            />
            <NumberField
              label="Glucose"
              hint={
                glucoseUnit === null
                  ? "Choose the unit first."
                  : "At or above normoglycaemia (100 mg/dL)."
              }
              unit={glucoseUnit ?? undefined}
              value={glucose}
              onChange={setGlucose}
              min={glucoseUnit ? GLUCOSE[glucoseUnit].min : undefined}
              max={glucoseUnit ? GLUCOSE[glucoseUnit].max : undefined}
            />
          </SimpleGrid>
          <ChoiceField
            label="Correction factor"
            value={method}
            onChange={setMethod}
            options={METHODS}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="mmol/L"
          badge={`${methodName(r.working.method)} correction`}
        />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Glucose", `${fmt(r.working.glucose_mgdl, 0)} mg/dL`],
            ["Factor", `${fmt(r.working.factor_mmol_per_100mgdl)} mmol/L per 100 mg/dL`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Corrected sodium ${fmt(r.result)} mmol/L (${methodName(r.working.method)} correction)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Measured sodium ${sodium} mmol/L`,
            `Glucose ${glucose} ${glucoseUnit}${glucoseUnit === "mmol/L" ? ` (${fmt(r.working.glucose_mgdl, 0)} mg/dL)` : ""}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "corrected_sodium",
  Component: CorrectedSodiumCalculator,
};
