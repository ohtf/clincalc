// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconRulerMeasure2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Body fat percentage by the US Navy circumference method (Hodgdon & Beckett 1984). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function BodyFatCircumferenceCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [neck, setNeck] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);

  const female = sex === "female";
  const waistNotAboveNeck = positive(waist) && positive(neck) && waist <= neck;
  const complete =
    sex !== null &&
    positive(height) &&
    positive(waist) &&
    positive(neck) &&
    !waistNotAboveNeck &&
    (!female || positive(hip));
  const calc = useCalculation(
    "body_fat_circumference",
    complete
      ? {
          sex,
          height_cm: height,
          waist_cm: waist,
          neck_cm: neck,
          ...(female ? { hip_cm: hip } : {}),
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconRulerMeasure2}
      title="Body fat % (US Navy circumference method)"
      badge="Anthropometry"
      description="Estimated body fat percentage from height and neck and waist circumference, plus hip circumference in women (Hodgdon & Beckett 1984). Standard error is about 3-4%; it does not replace clinical assessment or direct body-composition measurement."
      onReset={() => {
        setSex(null);
        setHeight(null);
        setWaist(null);
        setNeck(null);
        setHip(null);
      }}
      calc={calc}
      incomplete={
        sex === null
          ? "Choose the sex equation and enter the measurements to calculate."
          : `Enter height, waist, and neck${female ? ", and hip" : ""} circumference to calculate.`
      }
      form={
        <>
          <ChoiceField
            label="Sex"
            hint="Selects the regression equation; the female equation also uses hip circumference."
            value={sex}
            onChange={setSex}
            options={SEX}
          />
          <NumberField
            label="Standing height"
            unit="cm"
            value={height}
            onChange={setHeight}
            min={0}
            decimals={1}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Waist circumference"
              hint={
                sex === "male"
                  ? "At navel level."
                  : sex === "female"
                    ? "At the narrowest point."
                    : "At navel level (men) or the narrowest point (women)."
              }
              unit="cm"
              value={waist}
              onChange={setWaist}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Neck circumference"
              hint="Just below the larynx."
              unit="cm"
              value={neck}
              onChange={setNeck}
              min={0}
              decimals={1}
            />
          </SimpleGrid>
          {waistNotAboveNeck && (
            <Text size="sm" c="red">
              Waist circumference must be greater than neck circumference - check the measurements.
            </Text>
          )}
          {female && (
            <NumberField
              label="Hip circumference"
              hint="At the widest point. Required for the female equation."
              unit="cm"
              value={hip}
              onChange={setHip}
              min={0}
              decimals={1}
            />
          )}
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="% body fat (estimate)" />}
      summary={(r) =>
        summaryText({
          heading: `Estimated body fat ${fixed(r.result, 1)}% (US Navy circumference method)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex equation: ${sex}`,
            `Height ${height} cm`,
            `Waist ${waist} cm`,
            `Neck ${neck} cm`,
            female && `Hip ${hip} cm`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "body_fat_circumference",
  Component: BodyFatCircumferenceCalculator,
};
