// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconTestPipe } from "@tabler/icons-react";

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

/** Albumin/globulin ratio from total protein and albumin (Busher, Clinical Methods 1990). */

type Unit = "g/L" | "g/dL";

const UNITS: Choice<Unit>[] = [
  { value: "g/L", label: "g/L" },
  { value: "g/dL", label: "g/dL" },
];

const PROTEIN: Record<Unit, { min: number; max: number }> = {
  "g/L": { min: 20, max: 140 },
  "g/dL": { min: 2, max: 14 },
};
const ALBUMIN: Record<Unit, { min: number; max: number }> = {
  "g/L": { min: 2, max: 140 },
  "g/dL": { min: 0.2, max: 14 },
};

const fixed2 = (v: unknown) => asNumber(v)?.toFixed(2) ?? asText(v);

function AgRatioCalculator() {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);

  const valuesOk =
    unit !== null &&
    inRange(protein, PROTEIN[unit].min, PROTEIN[unit].max) &&
    inRange(albumin, ALBUMIN[unit].min, ALBUMIN[unit].max);
  const albuminTooHigh = valuesOk && albumin! >= protein!;
  const complete = valuesOk && !albuminTooHigh;
  const calc = useCalculation(
    "ag_ratio",
    complete ? { total_protein: protein, albumin, unit } : null,
  );
  const needUnit = unit === null ? "Choose the unit first." : undefined;

  return (
    <CalculatorPage
      icon={IconTestPipe}
      title="Albumin/globulin ratio"
      badge="Serum proteins"
      description="Globulin (total protein minus albumin) and the albumin/globulin ratio, a screen for raised globulins or low albumin. It does not identify the cause."
      onReset={() => {
        setUnit(null);
        setProtein(null);
        setAlbumin(null);
      }}
      calc={calc}
      incomplete={
        albuminTooHigh
          ? "Albumin must be lower than total protein."
          : unit === null
            ? "Choose the unit, then enter total protein and albumin."
            : "Enter total protein and albumin to calculate."
      }
      form={
        <>
          <ChoiceField layout="inline"
            label="Unit"
            hint="The unit your laboratory reports, used for both values."
            value={unit}
            onChange={setUnit}
            options={UNITS}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Total protein"
              hint={needUnit}
              unit={unit ?? undefined}
              value={protein}
              onChange={setProtein}
              min={unit ? PROTEIN[unit].min : undefined}
              max={unit ? PROTEIN[unit].max : undefined}
            />
            <NumberField
              label="Albumin"
              hint={needUnit}
              unit={unit ?? undefined}
              value={albumin}
              onChange={setAlbumin}
              min={unit ? ALBUMIN[unit].min : undefined}
              max={unit ? ALBUMIN[unit].max : undefined}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fixed2(r.result)} badge="A/G ratio" />}
      details={(r) => (
        <Facts
          items={[
            ["Globulin", `${fmt(r.working.globulin)} ${asText(r.working.unit)}`],
            ["Band", asText(r.working.band)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `A/G ratio ${fixed2(r.result)} (${asText(r.working.band)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Total protein ${protein} ${unit}`,
            `Albumin ${albumin} ${unit}`,
            `Globulin ${fmt(r.working.globulin)} ${asText(r.working.unit)}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "ag_ratio", Component: AgRatioCalculator };
