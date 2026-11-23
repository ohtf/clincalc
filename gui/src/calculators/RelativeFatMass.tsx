// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconPercentage } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Relative fat mass (Woolcott & Bergman 2018). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const AGE = { min: 20, max: 69 };
const HEIGHT = { min: 50, max: 250 };
const WAIST = { min: 30, max: 250 };

function RelativeFatMassCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);

  const complete =
    sex !== null &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(waist, WAIST.min, WAIST.max);
  const calc = useCalculation(
    "relative_fat_mass",
    complete ? { sex, age_years: age, height_cm: height, waist_cm: waist } : null,
  );

  return (
    <CalculatorPage
      icon={IconPercentage}
      title="Relative fat mass (RFM)"
      badge="Anthropometry"
      description="Sex-specific estimate of whole-body fat percentage from height and waist circumference (Woolcott & Bergman 2018), evaluated against DXA in US adults aged 20-69. No diagnostic cut-points were established; it does not diagnose obesity."
      onReset={() => {
        setSex(null);
        setAge(null);
        setHeight(null);
        setWaist(null);
      }}
      calc={calc}
      incomplete="Choose sex and enter age, height, and waist circumference to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Sex"
              hint="The source model has male and female coefficients only."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
            <NumberField
              label="Age"
              hint="Restricted to 20-69, the validation cohort range."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
          </SimpleGrid>
          <NumberField
            label="Standing height"
            unit="cm"
            value={height}
            onChange={setHeight}
            min={HEIGHT.min}
            max={HEIGHT.max}
            decimals={1}
          />
          <NumberField
            label="Waist circumference"
            hint="Standing, unclothed, horizontal at the uppermost lateral border of the right ilium, at the end of expiration, to the nearest 0.1 cm."
            unit="cm"
            value={waist}
            onChange={setWaist}
            min={WAIST.min}
            max={WAIST.max}
            decimals={1}
          />
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="% body fat (estimate)" />}
      details={(r) => (
        <Facts items={[["Height / waist", fixed(r.working.height_to_waist_ratio, 3)]]} />
      )}
      summary={(r) =>
        summaryText({
          heading: `Relative fat mass ${fixed(r.result, 1)}% (estimate)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex ${sex}, age ${age} years`,
            `Height ${height} cm`,
            `Waist circumference ${waist} cm`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "relative_fat_mass",
  Component: RelativeFatMassCalculator,
};
