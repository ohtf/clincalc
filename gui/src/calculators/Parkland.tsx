// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDropletHalf } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Parkland (Baxter) formula for adult first-24-hour burn resuscitation (Baxter & Shires 1968). */

const AGE = { min: 16, max: 120 };
const WEIGHT = { min: 20, max: 400 };
const TBSA = { min: 1, max: 100 };

const ml = (v: unknown) => fmt(v, 0);

function ParklandCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [tbsa, setTbsa] = useState<number | null>(null);

  const complete =
    inRange(age, AGE.min, AGE.max) &&
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    inRange(tbsa, TBSA.min, TBSA.max);
  const calc = useCalculation(
    "parkland",
    complete ? { age_years: age, weight_kg: weight, burn_tbsa_percent: tbsa } : null,
  );

  return (
    <CalculatorPage
      icon={IconDropletHalf}
      title="Parkland formula"
      badge="Major burns"
      description="Adult first-24-hour crystalloid volume after a major burn: 4 mL x kg x % TBSA, half in the first 8 hours from the time of burn (Baxter & Shires 1968). A starting estimate to titrate to response; not for children, and excludes maintenance fluid."
      onReset={() => {
        setAge(null);
        setWeight(null);
        setTbsa(null);
      }}
      calc={calc}
      incomplete="Enter age, weight, and burn area to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Age"
              hint="Adults only (16 and over)."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
            <NumberField
              label="Weight"
              hint="Actual body weight."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          <NumberField
            label="Burn area"
            hint="Partial-thickness (second-degree) or full-thickness burns only; exclude superficial erythema."
            unit="% TBSA"
            value={tbsa}
            onChange={setTbsa}
            min={TBSA.min}
            max={TBSA.max}
            decimals={1}
          />
        </>
      }
      result={(r) => <ScoreTile value={ml(r.result)} unit="mL over 24 h" />}
      details={(r) => (
        <Facts
          items={[
            ["First 8 h", `${ml(r.working.first_8h_ml)} mL (${ml(r.working.first_8h_ml_per_hour)} mL/h)`],
            ["Next 16 h", `${ml(r.working.next_16h_ml)} mL (${ml(r.working.next_16h_ml_per_hour)} mL/h)`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Parkland formula: ${ml(r.result)} mL crystalloid over the first 24 hours`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [`Age ${age} years`, `Weight ${weight} kg`, `Burn area ${tbsa}% TBSA`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "parkland", Component: ParklandCalculator };
