// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconBarbell } from "@tabler/icons-react";

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

/** One-repetition maximum estimate (Epley 1985; Brzycki 1993; Lombardi 1989). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Formula = "epley" | "brzycki" | "lombardi";

const FORMULAS: Choice<Formula>[] = [
  { value: "epley", label: "Epley", hint: "1RM = weight x (1 + reps / 30)" },
  { value: "brzycki", label: "Brzycki", hint: "1RM = weight x 36 / (37 - reps)" },
  { value: "lombardi", label: "Lombardi", hint: "1RM = weight x reps^0.10" },
];

const WEIGHT = { min: 0, max: 700 };
const REPS = { min: 1, max: 30 };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function OneRepMaxCalculator() {
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [formula, setFormula] = useState<Formula | null>(null);

  const complete =
    formula !== null &&
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    weight > 0 &&
    inRange(reps, REPS.min, REPS.max) &&
    Number.isInteger(reps);
  const calc = useCalculation(
    "one_rep_max",
    complete ? { weight_kg: weight, reps, formula } : null,
  );

  return (
    <CalculatorPage
      icon={IconBarbell}
      title="One-rep max estimate"
      badge="Strength testing"
      description="Estimated one-repetition maximum from a submaximal weight and the number of full repetitions completed. Validity falls as repetitions increase: most formulae are reasonable up to about 10 reps and unreliable above about 20."
      onReset={() => {
        setWeight(null);
        setReps(null);
        setFormula(null);
      }}
      calc={calc}
      incomplete="Enter the weight and reps, and choose a formula, to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Weight lifted"
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Repetitions"
              hint="Completed, full repetitions."
              unit="reps"
              value={reps}
              onChange={setReps}
              min={REPS.min}
              max={REPS.max}
              decimals={0}
            />
          </SimpleGrid>
          <ChoiceField label="Formula" value={formula} onChange={setFormula} options={FORMULAS} />
        </>
      }
      result={(r) => (
        <ScoreTile value={fixed(r.result, 1)} unit="kg" badge={labelOf(FORMULAS, formula)} />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated 1RM ${fixed(r.result, 1)} kg (${labelOf(FORMULAS, formula)})`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [`Weight lifted ${weight} kg`, `${reps} full repetitions`],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "one_rep_max", Component: OneRepMaxCalculator };
