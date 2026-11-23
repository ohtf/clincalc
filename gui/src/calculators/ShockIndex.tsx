// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

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
} from "../kit";

/** Shock index (Allgöwer & Burri 1967) with SIPA age-adjusted thresholds (Acker 2015). */

const AGE = { min: 0, max: 130 };
const MAX = 300;

const positiveUpTo = (v: number | null, max: number): v is number => inRange(v, undefined, max) && v > 0;

function elevatedText(v: unknown): string {
  if (v === true) return "Elevated";
  if (v === false) return "Not elevated";
  return "";
}

function ShockIndexCalculator() {
  const [age, setAge] = useState<number | null>(null);
  const [hr, setHr] = useState<number | null>(null);
  const [sbp, setSbp] = useState<number | null>(null);

  const complete = inRange(age, AGE.min, AGE.max) && positiveUpTo(hr, MAX) && positiveUpTo(sbp, MAX);
  const calc = useCalculation(
    "shock_index",
    complete ? { age_years: age, heart_rate_bpm: hr, systolic_bp_mmhg: sbp } : null,
  );

  return (
    <CalculatorPage
      icon={IconGauge}
      title="Shock index"
      badge="Haemodynamic assessment"
      description="Heart rate divided by systolic blood pressure, with the adult threshold of 0.9 and the paediatric age-adjusted (SIPA) thresholds for ages 4-16 (Allgöwer & Burri 1967; Acker 2015). No validated threshold is applied under age 4."
      onReset={() => {
        setAge(null);
        setHr(null);
        setSbp(null);
      }}
      calc={calc}
      incomplete={
        [hr, sbp].some((v) => v !== null && v <= 0)
          ? "Heart rate and systolic BP must be above 0."
          : "Enter age, heart rate, and systolic BP to calculate."
      }
      form={
        <>
          <NumberField
            label="Age"
            hint="Selects the adult or SIPA age-adjusted threshold."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={1}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Heart rate"
              unit="bpm"
              value={hr}
              onChange={setHr}
              min={0}
              max={MAX}
              decimals={0}
            />
            <NumberField
              label="Systolic BP"
              unit="mmHg"
              value={sbp}
              onChange={setSbp}
              min={0}
              max={MAX}
              decimals={0}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fmt(r.result, 2)} badge={elevatedText(r.working.elevated)} />}
      details={(r) => (
        <Facts
          items={[
            ["Population", asText(r.working.population)],
            r.working.threshold !== undefined && ["Threshold", fmt(r.working.threshold, 2)],
          ]}
        />
      )}
      summary={(r) => {
        const status = elevatedText(r.working.elevated);
        return summaryText({
          heading: `Shock index ${fmt(r.result, 2)}${status ? ` (${status.toLowerCase()})` : ""}`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Age ${age} years`, `Heart rate ${hr} bpm`, `Systolic BP ${sbp} mmHg`],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "shock_index", Component: ShockIndexCalculator };
