// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDroplets } from "@tabler/icons-react";

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

/** Calculated serum osmolality (2Na + glucose + urea) and osmolar gap (Glasser 1973). */

const SODIUM = { min: 0, max: 220 };
const GLUCOSE = { min: 0, max: 100 };
const UREA = { min: 0, max: 100 };
const MEASURED = { min: 0, max: 500 };

function SerumOsmolalityCalculator() {
  const [sodium, setSodium] = useState<number | null>(null);
  const [glucose, setGlucose] = useState<number | null>(null);
  const [urea, setUrea] = useState<number | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  const complete =
    inRange(sodium, SODIUM.min, SODIUM.max) &&
    inRange(glucose, GLUCOSE.min, GLUCOSE.max) &&
    inRange(urea, UREA.min, UREA.max) &&
    (measured === null || inRange(measured, MEASURED.min, MEASURED.max));
  const calc = useCalculation(
    "serum_osmolality",
    complete
      ? compact({
          sodium_mmol_l: sodium,
          glucose_mmol_l: glucose,
          urea_mmol_l: urea,
          measured_osmolality_mosm_kg: measured,
        })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDroplets}
      title="Serum osmolality"
      badge="Osmolar gap"
      description="Calculated serum osmolality (2 x sodium + glucose + urea, all in mmol/L), with the osmolar gap when a measured osmolality is available (Glasser 1973). A raised gap suggests an unmeasured osmole such as a toxic alcohol."
      onReset={() => {
        setSodium(null);
        setGlucose(null);
        setUrea(null);
        setMeasured(null);
      }}
      calc={calc}
      incomplete="Enter sodium, glucose, and urea to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Sodium"
              unit="mmol/L"
              value={sodium}
              onChange={setSodium}
              min={SODIUM.min}
              max={SODIUM.max}
            />
            <NumberField
              label="Glucose"
              unit="mmol/L"
              value={glucose}
              onChange={setGlucose}
              min={GLUCOSE.min}
              max={GLUCOSE.max}
            />
            <NumberField
              label="Urea"
              unit="mmol/L"
              value={urea}
              onChange={setUrea}
              min={UREA.min}
              max={UREA.max}
            />
          </SimpleGrid>
          <Text fw={600} size="sm" mt="xs">
            Osmolar gap
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Measured osmolality"
              hint="Optional. Laboratory value by freezing-point depression, from the same sample; adds the osmolar gap."
              unit="mOsm/kg"
              value={measured}
              onChange={setMeasured}
              min={MEASURED.min}
              max={MEASURED.max}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const elevated = r.working.osmolar_gap_elevated;
        return (
          <ScoreTile
            value={fmt(r.result)}
            unit="mOsm/kg"
            badge={
              elevated === true
                ? "Osmolar gap elevated"
                : elevated === false
                  ? "Osmolar gap not elevated"
                  : "Calculated"
            }
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Calculated osmolality", `${fmt(r.working.calculated_osmolality_mosm_kg)} mOsm/kg`],
            r.working.osmolar_gap_mosm_kg !== undefined && [
              "Osmolar gap",
              `${fmt(r.working.osmolar_gap_mosm_kg)} mOsm/kg`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading:
            r.working.osmolar_gap_mosm_kg !== undefined
              ? `Calculated osmolality ${fmt(r.result)} mOsm/kg; osmolar gap ${fmt(r.working.osmolar_gap_mosm_kg)} mOsm/kg (${r.working.osmolar_gap_elevated ? "elevated" : "not elevated"})`
              : `Calculated osmolality ${fmt(r.result)} mOsm/kg`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sodium ${sodium} mmol/L`,
            `Glucose ${glucose} mmol/L`,
            `Urea ${urea} mmol/L`,
            measured !== null && `Measured osmolality ${measured} mOsm/kg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "serum_osmolality",
  Component: SerumOsmolalityCalculator,
};
