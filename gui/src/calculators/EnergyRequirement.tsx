// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  compact,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/**
 * Adult BMR/RMR with optional activity factor and target adjustment
 * (Mifflin 1990; Harris & Benedict 1919; Roza & Shizgal 1984; Schofield 1985; Cunningham 1980).
 */

type Equation =
  | "mifflin_st_jeor"
  | "harris_benedict_original"
  | "harris_benedict_revised"
  | "schofield"
  | "cunningham";
type Sex = "male" | "female";

const EQUATIONS: Choice<Equation>[] = [
  { value: "mifflin_st_jeor", label: "Mifflin-St Jeor", hint: "Sex, age, weight, and height." },
  {
    value: "harris_benedict_original",
    label: "Harris-Benedict original",
    hint: "Sex, age, weight, and height.",
  },
  {
    value: "harris_benedict_revised",
    label: "Harris-Benedict revised (Roza-Shizgal)",
    hint: "Sex, age, weight, and height.",
  },
  {
    value: "schofield",
    label: "Schofield / FAO-WHO-UNU",
    hint: "Sex, age, and weight. Adult age bands 18-29, 30-59, and 60+.",
  },
  { value: "cunningham", label: "Cunningham", hint: "Lean body mass only." },
];

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const AGE = { min: 18, max: 120 };
const WEIGHT = { min: 20, max: 500 };
const HEIGHT = { min: 50, max: 250 };
const LEAN = { min: 5, max: 250 };
const ACTIVITY = { min: 1, max: 3 };
const ADJUSTMENT = { min: -2000, max: 2000 };

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function EnergyRequirementCalculator() {
  const [equation, setEquation] = useState<Equation | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [lean, setLean] = useState<number | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState<number | null>(null);

  const cunningham = equation === "cunningham";
  const needsHeight =
    equation === "mifflin_st_jeor" ||
    equation === "harris_benedict_original" ||
    equation === "harris_benedict_revised";

  const optionalOk =
    (activity === null || inRange(activity, ACTIVITY.min, ACTIVITY.max)) &&
    (adjustment === null || inRange(adjustment, ADJUSTMENT.min, ADJUSTMENT.max));
  const equationInputsOk =
    equation !== null &&
    (cunningham
      ? inRange(lean, LEAN.min, LEAN.max)
      : sex !== null &&
        inRange(age, AGE.min, AGE.max) &&
        Number.isInteger(age) &&
        inRange(weight, WEIGHT.min, WEIGHT.max) &&
        (!needsHeight || inRange(height, HEIGHT.min, HEIGHT.max)));
  const complete = equationInputsOk && optionalOk;

  const calc = useCalculation(
    "energy_requirement",
    complete
      ? compact({
          equation,
          ...(cunningham
            ? { lean_body_mass_kg: lean }
            : { sex, age, weight_kg: weight, ...(needsHeight ? { height_cm: height } : {}) }),
          activity_factor: activity,
          calorie_adjustment_kcal_day: adjustment,
        })
      : null,
  );

  return (
    <CalculatorPage
      icon={IconFlame}
      title="Energy requirement (BMR/RMR/TDEE)"
      badge="Adult nutrition"
      description="Adult basal or resting energy estimate by a chosen predictive equation, with an optional activity factor and calorie target adjustment. A predictive estimate, not indirect calorimetry; use clinician or dietitian judgement in serious illness, eating disorders, pregnancy, frailty, or complex nutritional care. Adults only."
      onReset={() => {
        setEquation(null);
        setSex(null);
        setAge(null);
        setWeight(null);
        setHeight(null);
        setLean(null);
        setActivity(null);
        setAdjustment(null);
      }}
      calc={calc}
      incomplete={
        equation === null
          ? "Choose an equation, then enter the measurements it needs."
          : cunningham
            ? "Enter lean body mass to calculate."
            : `Enter sex, age, weight${needsHeight ? ", and height" : ""} to calculate.`
      }
      form={
        <>
          <ChoiceField
            label="Equation"
            value={equation}
            onChange={setEquation}
            options={EQUATIONS}
          />
          {equation !== null && (
            <>
              <Text fw={600} mt="xs">
                {labelOf(EQUATIONS, equation)} inputs
              </Text>
              <Divider />
            </>
          )}
          {equation !== null && !cunningham && (
            <>
              <ChoiceField
                label="Sex"
                hint="Selects the equation coefficients. The equations predate modern sex and gender recording; in trans, intersex, or otherwise complex physiology, treat the result as an estimate and apply clinician or dietitian judgement."
                value={sex}
                onChange={setSex}
                options={SEX}
              />
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
                  label="Weight"
                  unit="kg"
                  value={weight}
                  onChange={setWeight}
                  min={WEIGHT.min}
                  max={WEIGHT.max}
                  decimals={1}
                />
                {needsHeight && (
                  <NumberField
                    label="Height"
                    unit="cm"
                    value={height}
                    onChange={setHeight}
                    min={HEIGHT.min}
                    max={HEIGHT.max}
                    decimals={1}
                  />
                )}
              </SimpleGrid>
            </>
          )}
          {cunningham && (
            <NumberField
              label="Lean body mass"
              unit="kg"
              value={lean}
              onChange={setLean}
              min={LEAN.min}
              max={LEAN.max}
              decimals={1}
            />
          )}
          <Text fw={600} mt="xs">
            Optional adjustments
          </Text>
          <Divider />
          <NumberField
            label="Activity factor"
            hint="Optional. Multiplies the basal estimate to give TDEE. Common values: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, extra active 1.9. FAO/WHO/UNU PAL ranges: about 1.40-1.69 sedentary/light, 1.70-1.99 active/moderate, 2.00-2.40 vigorous."
            value={activity}
            onChange={setActivity}
            min={ACTIVITY.min}
            max={ACTIVITY.max}
            decimals={3}
          />
          <NumberField
            label="Calorie adjustment"
            hint="Optional. Negative for weight loss, positive for weight gain; applied after the activity factor."
            unit="kcal/day"
            value={adjustment}
            onChange={setAdjustment}
            min={ADJUSTMENT.min}
            max={ADJUSTMENT.max}
            decimals={0}
          />
        </>
      }
      result={(r) => (
        <ScoreTile value={fmt(r.result)} unit="kcal/day" badge={asText(r.working.result_label)} />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Basal/resting", `${fmt(r.working.basal_kcal_day)} kcal/day`],
            asNumber(r.working.activity_factor) !== null && [
              "Activity factor",
              fmt(r.working.activity_factor, 3),
            ],
            asNumber(r.working.maintenance_kcal_day) !== null && [
              "Maintenance/TDEE",
              `${fmt(r.working.maintenance_kcal_day)} kcal/day`,
            ],
            asNumber(r.working.calorie_adjustment_kcal_day) !== null && [
              "Adjustment",
              `${fmt(r.working.calorie_adjustment_kcal_day, 0)} kcal/day`,
            ],
            asNumber(r.working.target_kcal_day) !== null && [
              "Target",
              `${fmt(r.working.target_kcal_day)} kcal/day`,
            ],
            asText(r.working.schofield_age_band) !== "" && [
              "Schofield age band",
              asText(r.working.schofield_age_band),
            ],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `${asText(r.working.result_label)} ${fmt(r.result)} kcal/day (${labelOf(EQUATIONS, equation)})`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: cunningham
            ? [
                `Lean body mass ${lean} kg`,
                activity !== null && `Activity factor ${activity}`,
                adjustment !== null && `Calorie adjustment ${adjustment} kcal/day`,
              ]
            : [
                `Sex ${sex}`,
                `Age ${age} years`,
                `Weight ${weight} kg`,
                needsHeight && `Height ${height} cm`,
                activity !== null && `Activity factor ${activity}`,
                adjustment !== null && `Calorie adjustment ${adjustment} kcal/day`,
              ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "energy_requirement",
  Component: EnergyRequirementCalculator,
};
