// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconMagnet } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
  ChoiceField,
} from "../kit";

/** Transferrin saturation from serum iron and TIBC, with the ACG 2019 haemochromatosis threshold (Kowdley 2019). */

type Unit = "umol/L" | "ug/dL";

const UNITS: Choice<Unit>[] = [
  { value: "umol/L", label: "µmol/L" },
  { value: "ug/dL", label: "µg/dL" },
];
const UNIT_LABEL: Record<Unit, string> = { "umol/L": "µmol/L", "ug/dL": "µg/dL" };

const IRON: Record<Unit, { min: number; max: number }> = {
  "umol/L": { min: 0.9, max: 89.5 },
  "ug/dL": { min: 5, max: 500 },
};
const TIBC: Record<Unit, { min: number; max: number }> = {
  "umol/L": { min: 9, max: 125 },
  "ug/dL": { min: 50, max: 700 },
};

function TransferrinSaturationCalculator() {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [iron, setIron] = useState<number | null>(null);
  const [tibc, setTibc] = useState<number | null>(null);

  const valuesOk =
    unit !== null &&
    inRange(iron, IRON[unit].min, IRON[unit].max) &&
    inRange(tibc, TIBC[unit].min, TIBC[unit].max);
  const ironTooHigh = valuesOk && iron! > tibc!;
  const complete = valuesOk && !ironTooHigh;
  const calc = useCalculation(
    "transferrin_saturation",
    complete ? { serum_iron: iron, tibc, unit } : null,
  );
  const unitLabel = unit ? UNIT_LABEL[unit] : undefined;
  const needUnit = unit === null ? "Choose the unit first." : undefined;

  return (
    <CalculatorPage
      icon={IconMagnet}
      title="Transferrin saturation"
      badge="Iron studies"
      description="Serum iron as a percentage of total iron-binding capacity, for iron deficiency and haemochromatosis work-up. Interpret with ferritin; inflammation lowers TIBC independently of iron status."
      onReset={() => {
        setUnit(null);
        setIron(null);
        setTibc(null);
      }}
      calc={calc}
      incomplete={
        ironTooHigh
          ? "Serum iron cannot exceed TIBC."
          : unit === null
            ? "Choose the unit, then enter serum iron and TIBC."
            : "Enter serum iron and TIBC to calculate."
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
              label="Serum iron"
              hint={needUnit}
              unit={unitLabel}
              value={iron}
              onChange={setIron}
              min={unit ? IRON[unit].min : undefined}
              max={unit ? IRON[unit].max : undefined}
            />
            <NumberField
              label="Total iron-binding capacity"
              hint={needUnit}
              unit={unitLabel}
              value={tibc}
              onChange={setTibc}
              min={unit ? TIBC[unit].min : undefined}
              max={unit ? TIBC[unit].max : undefined}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} unit="%" badge="Transferrin saturation" />}
      details={(r) => <Facts items={[["Band", asText(r.working.band)]]} />}
      summary={(r) =>
        summaryText({
          heading: `Transferrin saturation ${fmt(r.result)}% (${asText(r.working.band)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Serum iron ${iron} ${unitLabel}`, `TIBC ${tibc} ${unitLabel}`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "transferrin_saturation",
  Component: TransferrinSaturationCalculator,
};
