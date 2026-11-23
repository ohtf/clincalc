// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconStretching } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Fat-free mass index with height normalisation (Kouri 1995). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

const WEIGHT = { min: 20, max: 400 };
const HEIGHT = { min: 100, max: 250 };
const BODY_FAT = { min: 2, max: 70 };

function FatFreeMassIndexCalculator() {
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [bodyFat, setBodyFat] = useState<number | null>(null);

  const complete =
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(bodyFat, BODY_FAT.min, BODY_FAT.max);
  const calc = useCalculation(
    "fat_free_mass_index",
    complete ? { weight_kg: weight, height_cm: height, body_fat_percent: bodyFat } : null,
  );

  return (
    <CalculatorPage
      icon={IconStretching}
      title="Fat-free mass index (FFMI)"
      badge="Body composition"
      description="Fat-free mass relative to height, with Kouri's normalisation to a 1.8 m reference height (Kouri 1995). The study's preliminary male-athlete findings are not a diagnostic cut-point, a biological limit, or proof of steroid use, and do not establish interpretation in women or other populations."
      onReset={() => {
        setWeight(null);
        setHeight(null);
        setBodyFat(null);
      }}
      calc={calc}
      incomplete="Enter weight, height, and body fat percentage to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Weight"
              hint="Total body weight."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Standing height"
              hint="Measured standing height."
              unit="cm"
              value={height}
              onChange={setHeight}
              min={HEIGHT.min}
              max={HEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          <NumberField
            label="Body fat"
            hint="From an independent method, e.g. DXA, bioimpedance, skinfolds, or a circumference estimate. FFMI accuracy depends on this value and how it was measured."
            unit="%"
            value={bodyFat}
            onChange={setBodyFat}
            min={BODY_FAT.min}
            max={BODY_FAT.max}
            decimals={1}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={fixed(r.result, 1)} unit="kg/m²" badge="Normalised to 1.8 m" />
      )}
      details={(r) => (
        <Facts
          items={[
            ["FFMI (unnormalised)", `${fixed(r.working.ffmi, 1)} kg/m²`],
            ["Fat-free mass", `${fixed(r.working.fat_free_mass_kg, 1)} kg`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Normalised FFMI ${fixed(r.result, 1)} kg/m² (unnormalised ${fixed(r.working.ffmi, 1)} kg/m²)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Weight ${weight} kg`,
            `Height ${height} cm`,
            `Body fat ${bodyFat}%`,
            `Derived fat-free mass ${fixed(r.working.fat_free_mass_kg, 1)} kg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "fat_free_mass_index",
  Component: FatFreeMassIndexCalculator,
};
