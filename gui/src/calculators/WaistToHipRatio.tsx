// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconRuler2 } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Waist-to-hip ratio with WHO-attributed adult cut-offs (WHO Expert Consultation 2011). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";
type YesNo = "yes" | "no";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ADULT: Choice<YesNo>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const CIRCUMFERENCE = { min: 30, max: 250 };

const verdict = (r: { working: Record<string, unknown> }) =>
  r.working.at_or_above_who_attributed_cutoff === true ? "at or above" : "below";

function WaistToHipRatioCalculator() {
  const [adult, setAdult] = useState<YesNo | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);

  const complete =
    adult === "yes" &&
    sex !== null &&
    inRange(waist, CIRCUMFERENCE.min, CIRCUMFERENCE.max) &&
    inRange(hip, CIRCUMFERENCE.min, CIRCUMFERENCE.max);
  const calc = useCalculation(
    "waist_to_hip_ratio",
    complete ? { adult: true, sex, waist_cm: waist, hip_cm: hip } : null,
  );

  return (
    <CalculatorPage
      icon={IconRuler2}
      title="Waist-to-hip ratio (WHR)"
      badge="Adult anthropometry"
      description="Waist circumference divided by hip circumference, compared with the commonly WHO-attributed adult cut-offs (0.90 men, 0.85 women). The 2011 WHO report does not establish a universal cut-off; risk relationships vary between populations, and WHR is not a diagnosis on its own."
      onReset={() => {
        setAdult(null);
        setSex(null);
        setWaist(null);
        setHip(null);
      }}
      calc={calc}
      incomplete={
        adult === "no"
          ? "The WHO-attributed cut-offs come from adult evidence and do not establish paediatric cut-offs, so no result is given."
          : "Confirm the person is an adult, choose sex, and enter both circumferences to calculate."
      }
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Is the person an adult?"
              value={adult}
              onChange={setAdult}
              options={ADULT}
            />
            <ChoiceField label="Sex" value={sex} onChange={setSex} options={SEX} />
          </SimpleGrid>
          <NumberField
            label="Waist circumference"
            hint="Average of two WHO-protocol measurements within 1 cm of each other, at the midpoint between the lowest palpable rib and the top of the iliac crest, at the end of a normal expiration."
            unit="cm"
            value={waist}
            onChange={setWaist}
            min={CIRCUMFERENCE.min}
            max={CIRCUMFERENCE.max}
            decimals={1}
          />
          <NumberField
            label="Hip circumference"
            hint="Average of two WHO-protocol measurements within 1 cm of each other, around the widest part of the buttocks, tape parallel to the floor."
            unit="cm"
            value={hip}
            onChange={setHip}
            min={CIRCUMFERENCE.min}
            max={CIRCUMFERENCE.max}
            decimals={1}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={String(r.working.ratio_display ?? fixed(r.result, 3))}
          badge={`${verdict(r)} ${fixed(r.working.who_attributed_cutoff, 2)}`}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Waist-to-hip ratio ${String(r.working.ratio_display ?? fixed(r.result, 3))} (${verdict(r)} the WHO-attributed ${sex} cut-off of ${fixed(r.working.who_attributed_cutoff, 2)})`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Adult, ${sex}`,
            `Waist circumference ${waist} cm`,
            `Hip circumference ${hip} cm`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "waist_to_hip_ratio",
  Component: WaistToHipRatioCalculator,
};
