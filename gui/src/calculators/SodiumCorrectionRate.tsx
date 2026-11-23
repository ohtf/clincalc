// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconDropletUp } from "@tabler/icons-react";

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

/** Predicted sodium change per litre of infusate (Adrogue & Madias, NEJM 2000). */

const CURRENT_NA = { min: 100, below: 135 };
const INFUSATE_NA = { min: 0, max: 250 };
const INFUSATE_K = { min: 0, max: 80 };
const TBW = { min: 0.3, max: 0.7 };

function SodiumCorrectionRateCalculator() {
  const [weight, setWeight] = useState<number | null>(null);
  const [currentNa, setCurrentNa] = useState<number | null>(null);
  const [tbw, setTbw] = useState<number | null>(null);
  const [infusateNa, setInfusateNa] = useState<number | null>(null);
  const [infusateK, setInfusateK] = useState<number | null>(null);

  const complete =
    inRange(weight, 0) &&
    weight > 0 &&
    inRange(currentNa, CURRENT_NA.min, CURRENT_NA.below) &&
    currentNa < CURRENT_NA.below &&
    inRange(tbw, TBW.min, TBW.max) &&
    inRange(infusateNa, INFUSATE_NA.min, INFUSATE_NA.max) &&
    (infusateK === null || inRange(infusateK, INFUSATE_K.min, INFUSATE_K.max));
  const calc = useCalculation(
    "sodium_correction_rate",
    complete
      ? compact({
          weight_kg: weight,
          current_sodium_mmol_l: currentNa,
          infusate_sodium_mmol_l: infusateNa,
          infusate_potassium_mmol_l: infusateK,
          total_body_water_fraction: tbw,
        })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDropletUp}
      title="Sodium correction rate"
      badge="Hyponatraemia"
      description="Predicted change in serum sodium after one litre of a chosen infusate, using the Adrogue-Madias formula (Adrogue and Madias 2000). A static single-litre prediction to support planning, not a fluid prescription; recheck sodium frequently."
      onReset={() => {
        setWeight(null);
        setCurrentNa(null);
        setTbw(null);
        setInfusateNa(null);
        setInfusateK(null);
      }}
      calc={calc}
      incomplete={
        currentNa !== null && currentNa >= CURRENT_NA.below
          ? "Current sodium must be below 135 mmol/L: this formula is for hyponatraemia."
          : weight === 0
            ? "Weight must be above zero."
            : "Enter the patient values and the infusate sodium to calculate."
      }
      form={
        <>
          <Text fw={600} size="sm">
            Patient
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Current sodium"
              hint="From 100 to below 135 mmol/L."
              unit="mmol/L"
              value={currentNa}
              onChange={setCurrentNa}
              min={CURRENT_NA.min}
              max={CURRENT_NA.below}
            />
            <NumberField
              label="Weight"
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Total-body-water fraction"
              hint="0.3-0.7, chosen from clinical assessment (e.g. about 0.6 adult male, about 0.5 adult female, lower in older age). Enter a fraction, not a percentage."
              value={tbw}
              onChange={setTbw}
              min={TBW.min}
              max={TBW.max}
              step={0.05}
              decimals={2}
            />
          </SimpleGrid>
          <Text fw={600} size="sm" mt="xs">
            Infusate
          </Text>
          <Divider />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Infusate sodium"
              unit="mmol/L"
              value={infusateNa}
              onChange={setInfusateNa}
              min={INFUSATE_NA.min}
              max={INFUSATE_NA.max}
            />
            <NumberField
              label="Infusate potassium"
              hint="Optional. Leave empty for a potassium-free infusate."
              unit="mmol/L"
              value={infusateK}
              onChange={setInfusateK}
              min={INFUSATE_K.min}
              max={INFUSATE_K.max}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => {
        const change = typeof r.result === "number" ? r.result : Number(r.result);
        return (
          <ScoreTile
            value={change > 0 ? `+${fmt(change)}` : fmt(change)}
            unit="mmol/L per litre"
            badge={change >= 0 ? "Predicted rise" : "Predicted fall"}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Estimated total body water", `${fmt(r.working.estimated_total_body_water_l)} L`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Predicted serum sodium change ${fmt(r.result)} mmol/L per litre of infusate`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Current sodium ${currentNa} mmol/L`,
            `Weight ${weight} kg`,
            `Total-body-water fraction ${tbw}`,
            `Infusate sodium ${infusateNa} mmol/L`,
            infusateK !== null && `Infusate potassium ${infusateK} mmol/L`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "sodium_correction_rate",
  Component: SodiumCorrectionRateCalculator,
};
