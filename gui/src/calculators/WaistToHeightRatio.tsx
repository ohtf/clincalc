// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid, Text } from "@mantine/core";
import { IconRuler } from "@tabler/icons-react";

import {
  CalculatorPage,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Waist-to-height ratio (Ashwell & Gibson 2016). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

const WAIST = { min: 30, max: 250 };
const HEIGHT = { min: 50, max: 250 };

function WaistToHeightRatioCalculator() {
  const [waist, setWaist] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const waistAboveHeight =
    inRange(waist, WAIST.min, WAIST.max) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    waist > height;
  const complete =
    inRange(waist, WAIST.min, WAIST.max) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    !waistAboveHeight;
  const calc = useCalculation(
    "waist_to_height_ratio",
    complete ? { waist_cm: waist, height_cm: height } : null,
  );

  return (
    <CalculatorPage
      icon={IconRuler}
      title="Waist-to-height ratio (WHtR)"
      badge="Central adiposity"
      description="Waist circumference divided by height. The widely quoted 0.5 boundary is 'keep your waist to less than half your height' (Ashwell & Gibson 2016)."
      onReset={() => {
        setWaist(null);
        setHeight(null);
      }}
      calc={calc}
      incomplete="Enter waist circumference and height to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Waist circumference"
              unit="cm"
              value={waist}
              onChange={setWaist}
              min={WAIST.min}
              max={WAIST.max}
              decimals={1}
            />
            <NumberField
              label="Height"
              unit="cm"
              value={height}
              onChange={setHeight}
              min={HEIGHT.min}
              max={HEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          {waistAboveHeight && (
            <Text size="sm" c="red">
              Waist circumference cannot exceed height - check the measurements.
            </Text>
          )}
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 2)} />}
      summary={(r) =>
        summaryText({
          heading: `Waist-to-height ratio ${fixed(r.result, 2)}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Waist circumference ${waist} cm`, `Height ${height} cm`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "waist_to_height_ratio",
  Component: WaistToHeightRatioCalculator,
};
