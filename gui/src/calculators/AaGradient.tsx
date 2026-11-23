// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconWind } from "@tabler/icons-react";

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

/** Alveolar-arterial oxygen gradient (alveolar gas equation; age adjustment per Mellemgaard 1966). */

const FIO2 = { min: 0.21, max: 1 };
const PACO2 = { min: 10, max: 100 };
const PAO2 = { min: 20, max: 650 };
const AGE = { min: 0, max: 120 };

function AaGradientCalculator() {
  const [fio2, setFio2] = useState<number | null>(null);
  const [paco2, setPaco2] = useState<number | null>(null);
  const [pao2, setPao2] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);

  const complete =
    inRange(fio2, FIO2.min, FIO2.max) &&
    inRange(paco2, PACO2.min, PACO2.max) &&
    inRange(pao2, PAO2.min, PAO2.max) &&
    (age === null || (inRange(age, AGE.min, AGE.max) && Number.isInteger(age)));
  const calc = useCalculation(
    "aa_gradient",
    complete ? compact({ fio2, paco2_mm_hg: paco2, pao2_mm_hg: pao2, age_years: age }) : null,
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
        setAge(null);
      }}
      calc={calc}
      incomplete="Enter FiO2, PaCO2, and PaO2 from the same arterial blood gas."
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
            hint="Arterial, in mmHg (1 kPa = 7.5 mmHg)."
            unit="mmHg"
            value={paco2}
            onChange={setPaco2}
            min={PACO2.min}
            max={PACO2.max}
          />
          <NumberField
            label="PaO2"
            hint="Arterial, same blood gas, in mmHg."
            unit="mmHg"
            value={pao2}
            onChange={setPao2}
            min={PAO2.min}
            max={PAO2.max}
          />
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
            `PaCO2 ${paco2} mmHg`,
            `PaO2 ${pao2} mmHg`,
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
