// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconScale } from "@tabler/icons-react";

import {
  CalculatorPage,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** BMI with the WHO adult categories (WHO TRS 894, 2000). */

const WEIGHT = { min: 20, max: 500 };
const HEIGHT = { min: 50, max: 250 };

function BmiCalculator() {
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const complete =
    inRange(weight, WEIGHT.min, WEIGHT.max) && inRange(height, HEIGHT.min, HEIGHT.max);
  const calc = useCalculation("bmi", complete ? { weight_kg: weight, height_cm: height } : null);

  return (
    <CalculatorPage
      icon={IconScale}
      title="BMI"
      badge="Adult anthropometry"
      description="Body mass index with the standard WHO adult categories. A screening index: it does not measure body composition, and the categories are not validated for children or pregnancy."
      onReset={() => {
        setWeight(null);
        setHeight(null);
      }}
      calc={calc}
      incomplete="Enter weight and height to calculate."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Weight"
            unit="kg"
            value={weight}
            onChange={setWeight}
            min={WEIGHT.min}
            max={WEIGHT.max}
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
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} unit="kg/m²" badge={asText(r.working.category)} />
      )}
      summary={(r) =>
        summaryText({
          heading: `BMI ${fmt(r.result)} kg/m² (${asText(r.working.category)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Weight ${weight} kg`, `Height ${height} cm`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "bmi", Component: BmiCalculator };
