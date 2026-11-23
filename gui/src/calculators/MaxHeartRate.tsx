// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconRun } from "@tabler/icons-react";

import {
  CalculatorPage,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Age-predicted maximum heart rate (Tanaka 2001) with training zones, optionally by Karvonen heart-rate reserve. */

const AGE = { min: 10, max: 120 };
const RHR = { min: 30, max: 150 };

interface Zone {
  zone: string;
  lower_bpm: number;
  upper_bpm: number;
}

const zonesOf = (v: unknown): Zone[] =>
  Array.isArray(v)
    ? v.filter(
        (z): z is Zone =>
          typeof z === "object" &&
          z !== null &&
          typeof (z as Zone).zone === "string" &&
          typeof (z as Zone).lower_bpm === "number" &&
          typeof (z as Zone).upper_bpm === "number",
      )
    : [];

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function MaxHeartRateCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [rhr, setRhr] = useState<number | null>(null);

  const ageOk = inRange(age, AGE.min, AGE.max) && Number.isInteger(age);
  const rhrOk = rhr === null || (inRange(rhr, RHR.min, RHR.max) && Number.isInteger(rhr));
  const calc = useCalculation(
    "max_heart_rate",
    ageOk && rhrOk ? compact({ age_years: age, resting_hr: rhr }) : null,
  );

  return (
    <CalculatorPage
      icon={IconRun}
      title="Maximum heart rate"
      badge="Exercise"
      description="Estimated maximum heart rate by the Tanaka formula (208 - 0.7 x age) with aerobic training zones. With a resting heart rate, zones use the Karvonen heart-rate reserve method. Rounded estimates for healthy adults; exercise testing is more accurate."
      onReset={() => {
        setAge(null);
        setRhr(null);
      }}
      calc={calc}
      incomplete="Enter the patient's age to calculate."
      form={
        <SimpleGrid cols={2} spacing="md">
          <NumberField
            label="Age"
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <NumberField
            label="Resting heart rate"
            hint="Optional. When entered, zones use the Karvonen method."
            unit="bpm"
            value={rhr}
            onChange={setRhr}
            min={RHR.min}
            max={RHR.max}
            decimals={0}
          />
        </SimpleGrid>
      }
      result={(r) => <ScoreTile value={fmt(r.result)} unit="bpm" />}
      details={(r) => (
        <Facts
          title={`Training zones (${asText(r.working.method)})`}
          items={zonesOf(r.working.zones).map((z) => [
            capitalise(z.zone),
            `${z.lower_bpm}-${z.upper_bpm} bpm`,
          ])}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated maximum heart rate ${fmt(r.result)} bpm (Tanaka)`,
          interpretation: r.interpretation,
          findingsTitle: `Training zones (${asText(r.working.method)})`,
          findings: zonesOf(r.working.zones).map(
            (z) => `${capitalise(z.zone)}: ${z.lower_bpm}-${z.upper_bpm} bpm`,
          ),
          extra: [`Age ${age} years${rhr !== null ? `; resting heart rate ${rhr} bpm` : ""}`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "max_heart_rate", Component: MaxHeartRateCalculator };
