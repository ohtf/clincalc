// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";

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

/** DOTS powerlifting score (USA Powerlifting and USPA published coefficients). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";
type Lift = "bench_press" | "three_lift_total";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const LIFT: Choice<Lift>[] = [
  { value: "bench_press", label: "Bench press" },
  { value: "three_lift_total", label: "Three-lift total" },
];

const BODYWEIGHT_MIN = 40;

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function DotsCalculator() {
  const [sex, setSex] = useState<Sex | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);
  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [lifted, setLifted] = useState<number | null>(null);

  const complete =
    sex !== null &&
    lift !== null &&
    inRange(bodyweight, BODYWEIGHT_MIN) &&
    inRange(lifted, 0) &&
    lifted > 0;
  const calc = useCalculation(
    "dots",
    complete ? { sex, lift_type: lift, bodyweight_kg: bodyweight, lifted_kg: lifted } : null,
  );

  return (
    <CalculatorPage
      icon={IconTrophy}
      title="DOTS score"
      badge="Powerlifting"
      description="Bodyweight-adjusted powerlifting score for a bench press or three-lift total, using the DOTS coefficients published by USA Powerlifting and the USPA. Higher scores mean a stronger performance relative to bodyweight within the same category."
      onReset={() => {
        setSex(null);
        setLift(null);
        setBodyweight(null);
        setLifted(null);
      }}
      calc={calc}
      incomplete="Choose the category and lift, and enter bodyweight and the weight lifted, to calculate."
      form={
        <>
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Competition category"
              hint="Selects the coefficient polynomial."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
            <ChoiceField
              label="Lift"
              hint="Three-lift total: best squat, bench press, and deadlift."
              value={lift}
              onChange={setLift}
              options={LIFT}
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Bodyweight"
              hint="From 40 kg. The coefficient is capped above 210 kg (men) and 150 kg (women)."
              unit="kg"
              value={bodyweight}
              onChange={setBodyweight}
              min={BODYWEIGHT_MIN}
              decimals={2}
            />
            <NumberField
              label={
                lift === "three_lift_total"
                  ? "Three-lift total"
                  : lift === "bench_press"
                    ? "Bench press"
                    : "Weight lifted"
              }
              hint="Competition result."
              unit="kg"
              value={lifted}
              onChange={setLifted}
              min={0}
              decimals={1}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={fixed(r.result, 2)} badge="DOTS" />}
      details={(r) => (
        <Facts
          items={[
            ["Coefficient", fixed(r.working.coefficient, 4)],
            r.working.coefficient_was_capped === true && [
              "Coefficient capped at",
              `${fixed(r.working.coefficient_bodyweight_kg, 1)} kg`,
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `DOTS score ${fixed(r.result, 2)}`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Category ${sex}`,
            `${labelOf(LIFT, lift)} ${lifted} kg`,
            `Bodyweight ${bodyweight} kg`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = { name: "dots", Component: DotsCalculator };
