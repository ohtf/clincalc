// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconWind } from "@tabler/icons-react";

import {
  CalculatorPage,
  BLOOD_GAS_UNITS,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  compact,
  fmt,
  pressureInUnit,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type BloodGasUnit,
} from "../kit";

/** Alveolar-arterial oxygen gradient (alveolar gas equation; age adjustment per Mellemgaard 1966). */

const FIO2 = { min: 0.21, max: 1 };
const PACO2 = { min: 10, max: 100 };
const PAO2 = { min: 20, max: 650 };
const AGE = { min: 0, max: 120 };

function AaGradientCalculator() {
  const [fio2, setFio2] = useState<number | null>(null);
  const [paco2, setPaco2] = useState<number | null>(null);
  const [pao2, setPao2] = useState<number | null>(null);
  const [unit, setUnit] = useState<BloodGasUnit | null>(null);
  const [age, setAge] = useState<number | null>(null);

  const complete =
    inRange(fio2, FIO2.min, FIO2.max) &&
    unit !== null &&
    inRange(paco2, pressureInUnit(PACO2.min, unit), pressureInUnit(PACO2.max, unit)) &&
    inRange(pao2, pressureInUnit(PAO2.min, unit), pressureInUnit(PAO2.max, unit)) &&
    (age === null || (inRange(age, AGE.min, AGE.max) && Number.isInteger(age)));
  const calc = useCalculation(
    "aa_gradient",
    complete ? compact({
      fio2,
      [unit === "kPa" ? "paco2_kpa" : "paco2_mm_hg"]: paco2,
      [unit === "kPa" ? "pao2_kpa" : "pao2_mm_hg"]: pao2,
      age_years: age,
    }) : null,
  );

  return (
    <CalculatorPage
      icon={IconWind}
      title="A-a gradient"
      badge="Hypoxaemia"
      description="Alveolar-arterial oxygen gradient from the alveolar gas equation, assuming sea-level pressure (760 mmHg) and a respiratory quotient of 0.8. On room air, an age-adjusted expected gradient (age/4 + 4) can be shown for comparison (Mellemgaard 1966)."
      onReset={() => {
        setFio2(null);
        setPaco2(null);
        setPao2(null);
        setUnit(null);
        setAge(null);
      }}
      calc={calc}
      incomplete="Enter FiO2, PaCO2 and PaO2 from the same arterial blood gas, and select the pressure unit."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="FiO2"
            hint="Fraction of inspired oxygen, 0.21 (room air) to 1.0."
            value={fio2}
            onChange={setFio2}
            min={FIO2.min}
            max={FIO2.max}
            step={0.01}
            decimals={2}
          />
          <NumberField
            label="Age"
            hint="Optional. Adds the age-adjusted expected gradient, on room air (FiO2 0.21) only."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <NumberField
            label="PaCO2"
            hint="Arterial, from the same blood gas."
            unit={unit ?? undefined}
            value={paco2}
            onChange={setPaco2}
            min={unit ? pressureInUnit(PACO2.min, unit) : undefined}
            max={unit ? pressureInUnit(PACO2.max, unit) : undefined}
          />
          <NumberField
            label="PaO2"
            hint="Arterial, from the same blood gas."
            unit={unit ?? undefined}
            value={pao2}
            onChange={setPao2}
            min={unit ? pressureInUnit(PAO2.min, unit) : undefined}
            max={unit ? pressureInUnit(PAO2.max, unit) : undefined}
          />
          <ChoiceField label="Blood gas pressure unit" value={unit} onChange={(value) => {
            if (unit !== null) { setPaco2(null); setPao2(null); }
            setUnit(value);
          }} options={BLOOD_GAS_UNITS} layout="inline" />
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} unit="mmHg" badge="A-a gradient" />}
      details={(r) => (
        <Facts
          items={[
            ["Alveolar PAO2", `${fmt(r.working.alveolar_pao2_mm_hg)} mmHg`],
            r.working.expected_room_air_gradient_mm_hg !== undefined && [
              "Expected for age, room air",
              `${fmt(r.working.expected_room_air_gradient_mm_hg)} mmHg`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading:
            r.working.expected_room_air_gradient_mm_hg !== undefined
              ? `A-a gradient ${fmt(r.result)} mmHg (age-adjusted expected ${fmt(r.working.expected_room_air_gradient_mm_hg)} mmHg on room air)`
              : `A-a gradient ${fmt(r.result)} mmHg`,
          interpretation: r.interpretation,
          findingsTitle: "Arterial blood gas",
          findings: [
            `FiO2 ${fio2}`,
            `PaCO2 ${paco2} ${unit}`,
            `PaO2 ${pao2} ${unit}`,
            `Alveolar PAO2 ${fmt(r.working.alveolar_pao2_mm_hg)} mmHg (calculated)`,
            age !== null && `Age ${age} years`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "aa_gradient",
  Component: AaGradientCalculator,
};
