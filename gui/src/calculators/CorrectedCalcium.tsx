// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconBone } from "@tabler/icons-react";

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

/** Albumin-corrected calcium (Payne, BMJ 1973). */

type CalciumUnit = "mmol/L" | "mg/dL";
type AlbuminUnit = "g/L" | "g/dL";

const CALCIUM_UNITS: Choice<CalciumUnit>[] = [
  { value: "mmol/L", label: "mmol/L" },
  { value: "mg/dL", label: "mg/dL" },
];
const ALBUMIN_UNITS: Choice<AlbuminUnit>[] = [
  { value: "g/L", label: "g/L" },
  { value: "g/dL", label: "g/dL" },
];

const ALBUMIN: Record<AlbuminUnit, { min: number; max: number }> = {
  "g/L": { min: 10, max: 70 },
  "g/dL": { min: 1, max: 7 },
};

const fixed2 = (v: unknown) => asNumber(v)?.toFixed(2) ?? asText(v);

function CorrectedCalciumCalculator() {
  const [calciumUnit, setCalciumUnit] = useState<CalciumUnit | null>(null);
  const [calcium, setCalcium] = useState<number | null>(null);
  const [albuminUnit, setAlbuminUnit] = useState<AlbuminUnit | null>(null);
  const [albumin, setAlbumin] = useState<number | null>(null);

  const complete =
    calciumUnit !== null &&
    albuminUnit !== null &&
    inRange(calcium, 0) &&
    calcium > 0 &&
    inRange(albumin, ALBUMIN[albuminUnit].min, ALBUMIN[albuminUnit].max);
  const calc = useCalculation(
    "corrected_calcium",
    complete ? { calcium, calcium_unit: calciumUnit, albumin, albumin_unit: albuminUnit } : null,
  );

  return (
    <CalculatorPage
      icon={IconBone}
      title="Corrected calcium"
      badge="Calcium"
      description="Total serum calcium adjusted to an albumin of 40 g/L (4 g/dL) with the Payne correction (Payne 1973). Ionised calcium is preferred when calcium status is uncertain, especially in critical illness or acid-base disturbance."
      onReset={() => {
        setCalciumUnit(null);
        setCalcium(null);
        setAlbuminUnit(null);
        setAlbumin(null);
      }}
      calc={calc}
      incomplete={
        calcium === 0
          ? "Total calcium must be above zero."
          : "Choose each unit, then enter total calcium and albumin."
      }
      form={
        <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
          <ChoiceField layout="inline"
            label="Calcium unit"
            hint="The result is given in the same unit."
            value={calciumUnit}
            onChange={setCalciumUnit}
            options={CALCIUM_UNITS}
          />
          <NumberField
            label="Total calcium"
            hint={calciumUnit === null ? "Choose the unit first." : "Measured total, not ionised."}
            unit={calciumUnit ?? undefined}
            value={calcium}
            onChange={setCalcium}
            min={calciumUnit ? 0 : undefined}
          />
          <ChoiceField layout="inline"
            label="Albumin unit"
            value={albuminUnit}
            onChange={setAlbuminUnit}
            options={ALBUMIN_UNITS}
          />
          <NumberField
            label="Albumin"
            hint={albuminUnit === null ? "Choose the unit first." : undefined}
            unit={albuminUnit ?? undefined}
            value={albumin}
            onChange={setAlbumin}
            min={albuminUnit ? ALBUMIN[albuminUnit].min : undefined}
            max={albuminUnit ? ALBUMIN[albuminUnit].max : undefined}
          />
        </SimpleGrid>
      }
      result={(r) => (
        <ScoreTile
          value={fixed2(r.result)}
          unit={asText(r.working.unit)}
          badge="Adjusted calcium"
        />
      )}
      details={(r) => <Facts items={[["Albumin", `${fmt(r.working.albumin_g_l)} g/L`]]} />}
      summary={(r) =>
        summaryText({
          heading: `Albumin-corrected calcium ${fixed2(r.result)} ${asText(r.working.unit)}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Total calcium ${calcium} ${calciumUnit}`,
            `Albumin ${albumin} ${albuminUnit}`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "corrected_calcium",
  Component: CorrectedCalciumCalculator,
};
