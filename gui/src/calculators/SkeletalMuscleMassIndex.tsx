// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Divider, SimpleGrid, Text } from "@mantine/core";
import { IconStretching2 } from "@tabler/icons-react";

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

/** Skeletal muscle mass index (EWGSOP2, Cruz-Jentoft 2019) and FNIH ALM/BMI (Cawthon 2014; McLean 2014). */

const fixed = (v: unknown, decimals: number) => asNumber(v)?.toFixed(decimals) ?? "";

type Sex = "male" | "female";
type Method = "whole_body_dxa" | "other";

const SEX: Choice<Sex>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const METHOD: Choice<Method>[] = [
  { value: "whole_body_dxa", label: "Whole-body DXA" },
  { value: "other", label: "Another method (BIA, CT, MRI, ultrasound, or anthropometry)" },
];

const AGE = { min: 65, max: 120 };
const ALM = { min: 2, max: 60 };
const HEIGHT = { min: 100, max: 250 };
const WEIGHT = { min: 20, max: 400 };

const verdict = (low: unknown) => (low === true ? "below" : "not below");

function SkeletalMuscleMassIndexCalculator() {
  const [method, setMethod] = useState<Method | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [alm, setAlm] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);

  const almNotBelowWeight =
    inRange(alm, ALM.min, ALM.max) && inRange(weight, WEIGHT.min, WEIGHT.max) && alm >= weight;
  const complete =
    method === "whole_body_dxa" &&
    sex !== null &&
    inRange(age, AGE.min, AGE.max) &&
    Number.isInteger(age) &&
    inRange(alm, ALM.min, ALM.max) &&
    inRange(height, HEIGHT.min, HEIGHT.max) &&
    inRange(weight, WEIGHT.min, WEIGHT.max) &&
    !almNotBelowWeight;
  const calc = useCalculation(
    "skeletal_muscle_mass_index",
    complete
      ? {
          age_years: age,
          appendicular_lean_mass_kg: alm,
          height_cm: height,
          weight_kg: weight,
          sex,
          alm_measurement_method: method,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconStretching2}
      title="Skeletal muscle mass index (SMI)"
      badge="Sarcopenia - muscle quantity"
      description="Whole-body DXA appendicular lean mass relative to height (EWGSOP2 SMI, the primary result) and to BMI (FNIH ALM/BMI, a supplementary preliminary criterion) in adults aged 65 or older. Assesses muscle quantity only: it cannot diagnose or exclude sarcopenia, which also needs muscle strength and, for severity, physical performance."
      onReset={() => {
        setMethod(null);
        setSex(null);
        setAge(null);
        setAlm(null);
        setHeight(null);
        setWeight(null);
      }}
      calc={calc}
      incomplete={
        method === "other"
          ? "These cut-offs were derived and validated with appendicular lean mass from whole-body DXA; values from other methods are not interchangeable, so no result is given."
          : "Confirm the measurement method and enter every value to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Appendicular lean mass measured by"
            value={method}
            onChange={setMethod}
            options={METHOD}
          />
          <SimpleGrid cols={2} spacing="md">
            <ChoiceField
              label="Sex"
              hint="Selects the published male or female cut-offs."
              value={sex}
              onChange={setSex}
              options={SEX}
            />
            <NumberField
              label="Age"
              hint="65 or older, as in the FNIH cohorts."
              unit="years"
              value={age}
              onChange={setAge}
              min={AGE.min}
              max={AGE.max}
              decimals={0}
            />
          </SimpleGrid>
          <Text fw={600} mt="xs">
            Measurements
          </Text>
          <Divider />
          <NumberField
            label="Appendicular lean mass (ALM / ASM)"
            hint="Combined lean mass of both arms and both legs from whole-body DXA."
            unit="kg"
            value={alm}
            onChange={setAlm}
            min={ALM.min}
            max={ALM.max}
            decimals={2}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Standing height"
              hint="Objectively measured."
              unit="cm"
              value={height}
              onChange={setHeight}
              min={HEIGHT.min}
              max={HEIGHT.max}
              decimals={1}
            />
            <NumberField
              label="Weight"
              hint="Measured at the time of the DXA scan."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          {almNotBelowWeight && (
            <Text size="sm" c="red">
              Appendicular lean mass must be less than total body weight - check the values.
            </Text>
          )}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fixed(r.result, 1)}
          unit="kg/m²"
          badge={`${verdict(r.working.low_muscle_quantity_ewgsop2)} EWGSOP2 cut-off`}
        />
      )}
      details={(r) => (
        <Facts
          items={[
            ["EWGSOP2 cut-off", `${fixed(r.working.ewgsop2_cutoff_kg_m2, 1)} kg/m²`],
            ["FNIH ALM/BMI", fixed(r.working.alm_bmi_ratio, 3)],
            [
              "FNIH cut-off",
              `${fixed(r.working.fnih_cutoff, 3)} (${verdict(r.working.low_lean_mass_fnih)})`,
            ],
            ["BMI", `${fixed(r.working.bmi, 1)} kg/m²`],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `SMI (EWGSOP2) ${fixed(r.result, 1)} kg/m², ${verdict(r.working.low_muscle_quantity_ewgsop2)} the ${fixed(r.working.ewgsop2_cutoff_kg_m2, 1)} kg/m² cut-off; FNIH ALM/BMI ${fixed(r.working.alm_bmi_ratio, 3)}, ${verdict(r.working.low_lean_mass_fnih)} the ${fixed(r.working.fnih_cutoff, 3)} cut-off`,
          interpretation: r.interpretation,
          findingsTitle: "Measurements",
          findings: [
            `Sex ${sex}, age ${age} years`,
            `Appendicular lean mass ${alm} kg (whole-body DXA)`,
            `Height ${height} cm`,
            `Weight ${weight} kg (BMI ${fixed(r.working.bmi, 1)} kg/m²)`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "skeletal_muscle_mass_index",
  Component: SkeletalMuscleMassIndexCalculator,
};
