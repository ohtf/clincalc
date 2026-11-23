// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { IconRulerMeasure } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Body adiposity index, a legacy estimate (Bergman 2011; limitations from Cerqueira 2018). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Context = "legacy_estimate" | "other_use";

const CONTEXT: Choice<Context>[] = [
  {
    value: "legacy_estimate",
    label: "Legacy anthropometric estimate only",
    hint: "Historical or comparative calculation, with its limitations kept alongside the result.",
  },
  {
    value: "other_use",
    label: "Something else",
    hint: "A direct body-fat measurement, an obesity diagnosis or classification, or a treatment or referral decision.",
  },
];

const AGE = { min: 20, max: 50 };
const HEIGHT = { min: 148, max: 197 };
const HIP = { min: 82, max: 162.8 };

function BodyAdiposityIndexCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);

  const complete =
    context === "legacy_estimate" &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(hip, HIP.min, HIP.max);
  const calc = useCalculation(
    "body_adiposity_index",
    complete
      ? {
          assessment_context: "adult_legacy_anthropometric_estimate",
          age_years: age,
          height_cm: height,
          hip_cm: hip,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconRulerMeasure}
      title="Body adiposity index (BAI)"
      badge="Legacy estimate"
      description="Weight-free body-fat estimate from height and hip circumference (Bergman 2011). A 2018 systematic review found wide individual error and did not recommend BAI for adult body-fat determination. Ranges are limited to the TARA external-validation cohort."
      onReset={() => {
        setContext(null);
        setAge(null);
        setHeight(null);
        setHip(null);
      }}
      calc={calc}
      incomplete={
        context === "other_use"
          ? "BAI is only for use as a legacy adult anthropometric estimate. It is not a body-fat measurement and does not diagnose obesity or support treatment or referral decisions."
          : "Confirm the assessment context and enter age, height, and hip circumference to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Assessment context"
            hint="BAI is used here only as a legacy adult anthropometric estimate."
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <NumberField
            label="Age"
            hint="Restricted to 20-50, the range in the TARA external-validation cohort."
            unit="years"
            value={age}
            onChange={setAge}
            min={AGE.min}
            max={AGE.max}
            decimals={0}
          />
          <NumberField
            label="Standing height"
            hint="Restricted to 148-197 cm, the TARA cohort range."
            unit="cm"
            value={height}
            onChange={setHeight}
            min={HEIGHT.min}
            max={HEIGHT.max}
            decimals={1}
          />
          <NumberField
            label="Hip circumference"
            hint="Mean of three measurements, tape horizontal at the maximum posterior extension of the buttocks, over nonrestrictive underwear or lightweight shorts. Restricted to 82-162.8 cm."
            unit="cm"
            value={hip}
            onChange={setHip}
            min={HIP.min}
            max={HIP.max}
            decimals={1}
          />
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="% (estimate)" />}
      details={(r) => (
        <Facts
          items={[
            ["Height", `${fixed(r.working.height_m, 2)} m`],
            ["Hip / height^1.5", fixed(r.working.hip_to_height_ratio, 1)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Body adiposity index (BAI) legacy estimate ${fixed(r.result, 1)}%`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [`Age ${age} years`, `Height ${height} cm`, `Hip circumference ${hip} cm`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "body_adiposity_index",
  Component: BodyAdiposityIndexCalculator,
};
