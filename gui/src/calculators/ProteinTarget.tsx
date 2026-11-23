// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconEgg } from "@tabler/icons-react";

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

/** Resistance-training protein intake (Morton et al. 2018). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Context = "matches" | "does_not_match";

const CONTEXT: Choice<Context>[] = [
  {
    value: "matches",
    label: "Healthy adult, not energy restricted, resistance training",
    hint: "Age 18 or over, healthy, not in a caloric deficit, and resistance training at least twice weekly for at least six weeks.",
  },
  {
    value: "does_not_match",
    label: "Does not match",
    hint: "For example a child, a caloric deficit, pregnancy, renal or hepatic disease, an eating disorder, serious illness, or no qualifying resistance-training programme.",
  },
];

const AGE = { min: 18, max: 120 };
const WEIGHT = { min: 20, max: 300 };

function ciText(v: unknown): string {
  return Array.isArray(v) && v.length === 2 ? `${fixed(v[0], 1)}-${fixed(v[1], 1)}` : "";
}

function ProteinTargetCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);

  const complete =
    context === "matches" &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    inRange(weight, WEIGHT.min, WEIGHT.max);
  const calc = useCalculation(
    "protein_target",
    complete
      ? {
          evidence_context: "healthy_adult_not_energy_restricted_resistance_training",
          age_years: age,
          weight_kg: weight,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconEgg}
      title="Resistance-training protein intake"
      badge="Sports nutrition"
      description="Morton et al.'s prudent amount of about 2.2 g/kg body weight/day for healthy, non-energy-restricted adults doing resistance training, with the uncertain exploratory breakpoint behind it (Morton 2018). The confidence interval is not a target range and 2.2 g/kg/day is not a safety ceiling."
      onReset={() => {
        setContext(null);
        setAge(null);
        setWeight(null);
      }}
      calc={calc}
      incomplete={
        context === "does_not_match"
          ? "This calculator applies only to healthy adults who are not energy restricted and are doing resistance training. For energy-restricted, resistance-trained adults, use the Energy-Restricted Protein Target calculator."
          : "Confirm the population and enter age and weight to calculate."
      }
      form={
        <>
          <ChoiceField label="Population" value={context} onChange={setContext} options={CONTEXT} />
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
              label="Body weight"
              hint="Current total body weight - do not substitute lean body mass."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => (
        <ScoreTile value={fixed(r.result, 1)} unit="g/day" badge="Prudent amount, 2.2 g/kg/day" />
      )}
      details={(r) => (
        <Facts
          title="Breakpoint (exploratory)"
          items={[
            [
              "1.62 g/kg/day estimate",
              `${fixed(r.working.breakpoint_estimate_g_per_day, 1)} g/day`,
            ],
            ["95% CI", `${ciText(r.working.breakpoint_ci_g_per_day)} g/day`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Prudent protein amount ${fixed(r.result, 1)} g/day (2.2 g/kg/day, Morton 2018)`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            "Healthy adult, not energy restricted, undertaking resistance training",
            `Age ${age} years`,
            `Body weight ${weight} kg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "protein_target",
  Component: ProteinTargetCalculator,
};
