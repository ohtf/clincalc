// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconBodyScan } from "@tabler/icons-react";

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

/** Jackson-Pollock 3-site skinfold body fat (Jackson & Pollock 1978; Jackson, Pollock & Ward 1980; Siri 1961). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";
type Site = "chest_mm" | "abdomen_mm" | "thigh_mm" | "triceps_mm" | "suprailiac_mm";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const SITE_INFO: Record<Site, { label: string; hint: string }> = {
  chest_mm: {
    label: "Chest",
    hint: "Diagonal fold halfway between the anterior axillary line and the nipple.",
  },
  abdomen_mm: { label: "Abdomen", hint: "Vertical fold 2 cm to the right of the umbilicus." },
  thigh_mm: {
    label: "Thigh",
    hint: "Vertical fold on the anterior midline, midway between the proximal border of the patella and the inguinal crease.",
  },
  triceps_mm: {
    label: "Triceps",
    hint: "Vertical fold on the posterior midline of the upper arm, midway between the acromion and olecranon.",
  },
  suprailiac_mm: {
    label: "Suprailiac",
    hint: "Diagonal fold immediately above the iliac crest at the anterior axillary line, following its natural angle.",
  },
};

const SITES: Record<Sex, Site[]> = {
  male: ["chest_mm", "abdomen_mm", "thigh_mm"],
  female: ["triceps_mm", "suprailiac_mm", "thigh_mm"],
};

const AGE: Record<Sex | "any", { min: number; max: number }> = {
  any: { min: 18, max: 61 },
  male: { min: 18, max: 61 },
  female: { min: 18, max: 55 },
};
const FOLD = { min: 2, max: 100 };
const MAX_SUM = 120;

type Folds = Record<Site, number | null>;
const emptyFolds = (): Folds => ({
  chest_mm: null,
  abdomen_mm: null,
  thigh_mm: null,
  triceps_mm: null,
  suprailiac_mm: null,
});

function JacksonPollockSkinfoldCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [folds, setFolds] = useState<Folds>(emptyFolds);

  const ageRange = AGE[sex ?? "any"];
  const sites = sex ? SITES[sex] : [];
  const sitesOk = sex !== null && sites.every((s) => inRange(folds[s], FOLD.min, FOLD.max));
  const sum = sitesOk ? sites.reduce((acc, s) => acc + (folds[s] ?? 0), 0) : null;
  const sumTooHigh = sum !== null && sum > MAX_SUM;
  const complete =
    sitesOk && !sumTooHigh && inRange(age, ageRange.min, ageRange.max) && Number.isInteger(age);
  const calc = useCalculation(
    "jackson_pollock_skinfold",
    complete && sex
      ? { sex, age_years: age, ...Object.fromEntries(sites.map((s) => [s, folds[s]])) }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconBodyScan}
      title="Jackson-Pollock 3-site skinfold"
      badge="Body composition"
      description="Body fat estimate from three sex-specific skinfold sites via the Jackson-Pollock body-density equations and the Siri conversion. Source samples were nearly all non-Hispanic white; limited to the source age ranges and a three-site sum of at most 120 mm. Model error is not an individual accuracy bound."
      onReset={() => {
        setSex(null);
        setAge(null);
        setFolds(emptyFolds());
      }}
      calc={calc}
      incomplete={
        sex === null
          ? "Choose sex to show the skinfold sites for that equation."
          : "Enter age and all three skinfolds to calculate."
      }
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Sex"
              hint="Selects the equation and its skinfold sites."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
            <NumberField
              label="Age"
              hint={
                sex === "female"
                  ? "Source range 18-55; the women's source advises care above 40."
                  : sex === "male"
                    ? "Source range 18-61."
                    : "Men 18-61, women 18-55."
              }
              unit="years"
              value={age}
              onChange={setAge}
              min={ageRange.min}
              max={ageRange.max}
              decimals={0}
            />
          </SimpleGrid>
          {sex !== null && (
            <>
              <Text fw={600} mt="xs">
                Skinfolds ({sex === "male" ? "chest, abdomen, thigh" : "triceps, suprailiac, thigh"}
                )
              </Text>
              <Divider />
              <Text size="xs" c="dimmed">
                Trained assessor, calibrated caliper, consistent standardised technique. The 2-100
                mm per-site bound is an input-safety guard.
              </Text>
              {sites.map((s) => (
                <NumberField
                  key={s}
                  label={SITE_INFO[s].label}
                  hint={SITE_INFO[s].hint}
                  unit="mm"
                  value={folds[s]}
                  onChange={(v) => setFolds((prev) => ({ ...prev, [s]: v }))}
                  min={FOLD.min}
                  max={FOLD.max}
                  decimals={1}
                />
              ))}
              {sum !== null && (
                <Text size="sm" c={sumTooHigh ? "red" : "dimmed"}>
                  Three-site sum {fixed(sum, 1)} mm
                  {sumTooHigh
                    ? " - above 120 mm, where later evidence found the equations underestimate body fat, so no estimate is given."
                    : " (at most 120 mm)."}
                </Text>
              )}
            </>
          )}
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="% body fat (estimate)" />}
      details={(r) => (
        <Facts
          items={[
            ["Sum of skinfolds", `${fixed(r.working.sum_skinfolds_mm, 1)} mm`],
            ["Body density", fixed(r.working.body_density, 4)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated body fat ${fixed(r.result, 1)}% (Jackson-Pollock 3-site skinfold)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex ${sex}, age ${age} years`,
            ...sites.map((s) => `${SITE_INFO[s].label} ${folds[s]} mm`),
            `Sum of skinfolds ${fixed(r.working.sum_skinfolds_mm, 1)} mm`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "jackson_pollock_skinfold",
  Component: JacksonPollockSkinfoldCalculator,
};
