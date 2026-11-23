// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconScaleOutline } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  compact,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Ideal body weight by the Devine formula (Devine 1974). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "Male" | "Female";

const SEX: Choice<Sex>[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const HEIGHT = { min: 152.4, max: 230 };
const ACTUAL = { min: 10, max: 400 };

function IdealBodyWeightCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [actual, setActual] = useState<number | null>(null);

  const complete =
    sex !== null &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    (actual === null || inRange(actual, ACTUAL.min, ACTUAL.max));
  const calc = useCalculation(
    "ideal_body_weight",
    complete ? compact({ sex, height_cm: height, actual_weight_kg: actual }) : null,
  );

  return (
    <CalculatorPage
      icon={IconScaleOutline}
      title="Ideal body weight (Devine)"
      badge="Drug dosing"
      description="Ideal body weight from sex and height by the Devine formula (Devine 1974), with adjusted body weight when actual weight exceeds 130% of ideal. Defined for adults at least 152.4 cm (60 in) tall. Whether to dose on actual, ideal, or adjusted weight is drug- and guideline-specific."
      onReset={() => {
        setSex(null);
        setHeight(null);
        setActual(null);
      }}
      calc={calc}
      incomplete="Choose sex and enter height to calculate."
      form={
        <>
          <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
          <NumberField
            label="Height"
            hint="The Devine formula is defined for adults at least 152.4 cm (60 in) tall."
            unit="cm"
            value={height}
            onChange={setHeight}
            min={HEIGHT.min}
            max={HEIGHT.max}
            decimals={1}
          />
          <NumberField
            label="Actual body weight"
            hint="Optional. If it exceeds 130% of ideal body weight, adjusted body weight (IBW + 0.4 x (actual - IBW)) is also reported."
            unit="kg"
            value={actual}
            onChange={setActual}
            min={ACTUAL.min}
            max={ACTUAL.max}
            decimals={1}
          />
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="kg" badge="Ideal body weight" />}
      details={(r) =>
        asNumber(r.working.adjusted_body_weight_kg) !== null ? (
          <Facts
            items={[["Adjusted body weight", `${fixed(r.working.adjusted_body_weight_kg, 1)} kg`]]}
          />
        ) : null
      }
      summary={(r) => {
        const adjusted = asNumber(r.working.adjusted_body_weight_kg);
        return summaryText({
          heading: `Ideal body weight ${fixed(r.result, 1)} kg (Devine)${adjusted !== null ? `; adjusted body weight ${fixed(adjusted, 1)} kg` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex ${sex?.toLowerCase()}`,
            `Height ${height} cm`,
            actual !== null && `Actual body weight ${actual} kg`,
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = {
  name: "ideal_body_weight",
  Component: IdealBodyWeightCalculator,
};
