// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconMicroscope } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Absolute neutrophil count with CTCAE v5.0 neutropenia grading. */

const WBC = { min: 0.1, max: 100 };
const NEUTROPHILS = { min: 0, max: 100 };
const BANDS = { min: 0, max: 50 };

const GRADE_COLOUR: Array<[prefix: string, colour: string]> = [
  ["normal", "teal"],
  ["CTCAE grade 1", "yellow"],
  ["CTCAE grade 2", "orange"],
  ["CTCAE grade 3", "red"],
  ["CTCAE grade 4", "red"],
];
const colourOf = (band: string) =>
  GRADE_COLOUR.find(([prefix]) => band.startsWith(prefix))?.[1] ?? "teal";

const siText = (v: unknown) => {
  const perUl = asNumber(v);
  return perUl === null ? "" : ` (${(perUl / 1000).toFixed(2)} x10⁹/L)`;
};

function AncCalculator() {
  const [wbc, setWbc] = useState<number | null>(null);
  const [neutrophils, setNeutrophils] = useState<number | null>(null);
  const [bands, setBands] = useState<number | null>(null);

  const valuesOk =
    inRange(wbc, WBC.min, WBC.max) &&
    inRange(neutrophils, NEUTROPHILS.min, NEUTROPHILS.max) &&
    (bands === null || inRange(bands, BANDS.min, BANDS.max));
  const overHundred = valuesOk && neutrophils! + (bands ?? 0) > 100;
  const complete = valuesOk && !overHundred;
  const calc = useCalculation(
    "anc",
    complete
      ? compact({ wbc_x10_9_l: wbc, neutrophils_percent: neutrophils, bands_percent: bands })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconMicroscope}
      title="Absolute neutrophil count"
      badge="Neutropenia"
      description="Absolute neutrophil count from the white cell count and differential (neutrophils plus band forms), graded with CTCAE v5.0. Fever with a low count may be febrile neutropenia, a medical emergency."
      onReset={() => {
        setWbc(null);
        setNeutrophils(null);
        setBands(null);
      }}
      calc={calc}
      incomplete={
        overHundred
          ? "Neutrophils and band forms together cannot exceed 100%."
          : "Enter the white cell count and neutrophil percentage to calculate."
      }
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="White cell count"
            unit="x10⁹/L"
            value={wbc}
            onChange={setWbc}
            min={WBC.min}
            max={WBC.max}
          />
          <NumberField
            label="Neutrophils"
            hint="Segmented (mature) neutrophils on the differential."
            unit="%"
            value={neutrophils}
            onChange={setNeutrophils}
            min={NEUTROPHILS.min}
            max={NEUTROPHILS.max}
          />
          <NumberField
            label="Band forms"
            hint="Optional. Leave empty if the differential does not report them."
            unit="%"
            value={bands}
            onChange={setBands}
            min={BANDS.min}
            max={BANDS.max}
          />
        </SimpleGrid>
      }
      result={(r) => {
        const band = asText(r.working.band);
        return (
          <ScoreTile
            value={fmt(r.result, 0)}
            unit="cells/µL"
            colour={colourOf(band)}
            badge={band.split(" (")[0]}
          />
        );
      }}
      details={(r) => {
        const perUl = asNumber(r.result);
        return (
          perUl !== null && (
            <Facts items={[["In SI units", `${(perUl / 1000).toFixed(2)} x10⁹/L`]]} />
          )
        );
      }}
      summary={(r) =>
        summaryText({
          heading: `ANC ${fmt(r.result, 0)} cells/µL${siText(r.result)} - ${asText(r.working.band)}`,
          interpretation: r.interpretation,
          findingsTitle: "Full blood count",
          findings: [
            `White cell count ${wbc} x10⁹/L`,
            `Neutrophils ${neutrophils}%`,
            bands !== null && `Band forms ${bands}%`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "anc", Component: AncCalculator };
