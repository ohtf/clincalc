// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDimensions } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Body surface area by the Mosteller formula (Mosteller 1987). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

const HEIGHT = { min: 10, max: 250 };
const WEIGHT = { min: 0.5, max: 300 };

function BodySurfaceAreaCalculator() {
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);

  const complete =
    inRange(height, HEIGHT.min, HEIGHT.max) && inRange(weight, WEIGHT.min, WEIGHT.max);
  const calc = useCalculation(
    "body_surface_area",
    complete ? { height_cm: height, weight_kg: weight } : null,
  );

  return (
    <CalculatorPage
      icon={IconDimensions}
      title="Body surface area (Mosteller)"
      badge="Anthropometry"
      description="Body surface area from height and weight by the Mosteller formula (Mosteller 1987). Use for drug dosing or indexing must follow the relevant protocol."
      onReset={() => {
        setHeight(null);
        setWeight(null);
      }}
      calc={calc}
      incomplete="Enter height and weight to calculate."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Height"
            unit="cm"
            value={height}
            onChange={setHeight}
            min={HEIGHT.min}
            max={HEIGHT.max}
            decimals={1}
          />
          <NumberField
            label="Weight"
            unit="kg"
            value={weight}
            onChange={setWeight}
            min={WEIGHT.min}
            max={WEIGHT.max}
            decimals={2}
          />
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 2)} unit="m²" />}
      details={(r) => <Facts items={[["Formula", asText(r.working.formula)]]} />}
      summary={(r) =>
        summaryText({
          heading: `Body surface area ${fixed(r.result, 2)} m² (Mosteller)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Height ${height} cm`, `Weight ${weight} kg`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "body_surface_area",
  Component: BodySurfaceAreaCalculator,
};
