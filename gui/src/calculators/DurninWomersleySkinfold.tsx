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
  asText,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Durnin-Womersley 4-site skinfold body fat (Durnin & Womersley 1974; Siri 1961). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const AGE: Record<Sex | "any", { min: number; max: number }> = {
  any: { min: 16, max: 72 },
  male: { min: 17, max: 72 },
  female: { min: 16, max: 68 },
};
const FOLD = { min: 2, max: 100 };

const SITES = [
  {
    key: "biceps_mm",
    label: "Biceps",
    hint: "Vertical fold over the mid-point of biceps brachii, at the same level as the triceps site, arm relaxed.",
  },
  {
    key: "triceps_mm",
    label: "Triceps",
    hint: "Vertical fold on the posterior midline of the upper arm, midway between the acromion and olecranon, arm relaxed.",
  },
  {
    key: "subscapular_mm",
    label: "Subscapular",
    hint: "Diagonal fold just below the inferior angle of the scapula, about 45 degrees to the vertical.",
  },
  {
    key: "suprailiac_mm",
    label: "Supra-iliac",
    hint: "Diagonal fold immediately above the iliac crest, in the mid-axillary line.",
  },
] as const;

type Site = (typeof SITES)[number]["key"];
type Folds = Record<Site, number | null>;

const emptyFolds = (): Folds => Object.fromEntries(SITES.map((s) => [s.key, null])) as Folds;

function DurninWomersleySkinfoldCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [folds, setFolds] = useState<Folds>(emptyFolds);

  const ageRange = AGE[sex ?? "any"];
  const complete =
    sex !== null &&
    inRange(age, ageRange.min, ageRange.max) &&
    Number.isInteger(age) &&
    SITES.every((s) => inRange(folds[s.key], FOLD.min, FOLD.max));
  const calc = useCalculation(
    "durnin_womersley_skinfold",
    complete ? { sex, age_years: age, ...folds } : null,
  );

  return (
    <CalculatorPage
      icon={IconBodyScan}
      title="Durnin-Womersley 4-site skinfold"
      badge="Body composition"
      description="Body fat estimate from biceps, triceps, subscapular, and supra-iliac skinfolds, via age- and sex-banded body-density equations and the Siri conversion (Durnin & Womersley 1974). Model error is not an individual accuracy bound, and later validation found a tendency to under-estimate body fat."
      onReset={() => {
        setSex(null);
        setAge(null);
        setFolds(emptyFolds());
      }}
      calc={calc}
      incomplete="Choose sex, enter age, and all four skinfolds to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Sex"
              hint="Selects the age-banded equation."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
            <NumberField
              label="Age"
              hint={
                sex === null
                  ? "Men 17-72, women 16-68."
                  : `Source range for ${sex === "male" ? "men" : "women"}: ${ageRange.min}-${ageRange.max}.`
              }
              unit="years"
              value={age}
              onChange={setAge}
              min={ageRange.min}
              max={ageRange.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} mt="xs">
            Skinfolds
          </Text>
          <Divider />
          <Text size="xs" c="dimmed">
            Calibrated caliper, trained assessor, consistent standardised technique. The 2-100 mm
            bound is an input-safety guard, not a source threshold.
          </Text>
          <SimpleGrid cols={2} spacing="md">
            {SITES.map((s) => (
              <NumberField
                key={s.key}
                label={s.label}
                hint={s.hint}
                unit="mm"
                value={folds[s.key]}
                onChange={(v) => setFolds((prev) => ({ ...prev, [s.key]: v }))}
                min={FOLD.min}
                max={FOLD.max}
                decimals={1}
              />
            ))}
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 1)} unit="% body fat (estimate)" />}
      details={(r) => (
        <Facts
          items={[
            ["Age band", asText(r.working.age_band)],
            ["Sum of skinfolds", `${fixed(r.working.sum_skinfolds_mm, 1)} mm`],
            ["Body density", fixed(r.working.body_density, 4)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated body fat ${fixed(r.result, 1)}% (Durnin-Womersley 4-site skinfold)`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex ${sex}, age ${age} years (band ${asText(r.working.age_band)})`,
            ...SITES.map((s) => `${s.label} ${folds[s.key]} mm`),
            `Sum of skinfolds ${fixed(r.working.sum_skinfolds_mm, 1)} mm`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "durnin_womersley_skinfold",
  Component: DurninWomersleySkinfoldCalculator,
};
