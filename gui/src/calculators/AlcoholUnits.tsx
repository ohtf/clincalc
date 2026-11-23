// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconGlassFull } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** UK alcohol units from volume and ABV (UK Chief Medical Officers 2016). */

const ABV_MAX = 80;

const positive = (v: number | null): v is number => inRange(v, 0) && v > 0;

function AlcoholUnitsCalculator() {
  const [volume, setVolume] = useState<number | null>(null);
  const [abv, setAbv] = useState<number | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const [perWeek, setPerWeek] = useState<number | null>(null);

  const optionalOk = (v: number | null) => v === null || positive(v);
  const complete =
    positive(volume) &&
    positive(abv) &&
    inRange(abv, 0, ABV_MAX) &&
    optionalOk(servings) &&
    optionalOk(perWeek);
  const calc = useCalculation(
    "alcohol_units",
    complete
      ? compact({ volume_ml: volume, abv_percent: abv, servings, servings_per_week: perWeek })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconGlassFull}
      title="Alcohol units"
      badge="UK units"
      description="UK alcohol units in a drink from its volume and strength, with an optional weekly total. One UK unit is 10 mL (about 8 g) of pure alcohol; the UK Chief Medical Officers' low-risk guideline is no more than 14 units a week, spread over several days."
      onReset={() => {
        setVolume(null);
        setAbv(null);
        setServings(null);
        setPerWeek(null);
      }}
      formTitle="Describe one serving"
      calc={calc}
      incomplete="Enter the volume and ABV of the drink to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Volume per serving"
              hint="Must be above 0."
              unit="mL"
              value={volume}
              onChange={setVolume}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Strength (ABV)"
              hint="Above 0, up to 80."
              unit="%"
              value={abv}
              onChange={setAbv}
              min={0}
              max={ABV_MAX}
              decimals={2}
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Servings"
              hint="Optional - number of these servings; 1 if left empty."
              value={servings}
              onChange={setServings}
              min={0}
              decimals={2}
            />
            <NumberField
              label="Servings per week"
              hint="Optional - how often this serving is drunk each week, for a weekly total."
              unit="per week"
              value={perWeek}
              onChange={setPerWeek}
              min={0}
              decimals={2}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} unit="UK units" />}
      details={(r) => (
        <Facts
          items={[
            ["Pure alcohol", `${fmt(r.working.ethanol_g)} g`],
            ["Alcohol energy", `${fmt(r.working.alcohol_kcal)} kcal`],
            r.working.weekly_units !== undefined && [
              "Weekly",
              `${fmt(r.working.weekly_units)} units (guideline ${fmt(r.working.uk_low_risk_weekly_limit_units)})`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Alcohol: ${fmt(r.result)} UK units${r.working.weekly_units !== undefined ? `; about ${fmt(r.working.weekly_units)} units per week` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Drink",
          findings: [
            `Volume ${volume} mL per serving at ${abv}% ABV`,
            `Servings: ${servings ?? 1}`,
            perWeek !== null && `Servings per week: ${perWeek}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "alcohol_units",
  Component: AlcoholUnitsCalculator,
};
