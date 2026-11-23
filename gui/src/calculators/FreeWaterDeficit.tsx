// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconDropletPlus } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asNumber,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Free-water deficit in adult hypernatraemia (Yun, Baek & Kim 2023; Adrogue & Madias 2000). */

type Context = "adult_with_hypernatraemia";

const CONTEXT: Choice<Context>[] = [
  {
    value: "adult_with_hypernatraemia",
    label: "Adult with hypernatraemia (sodium above 145 mmol/L)",
    hint: "After clinical assessment of cause and volume status. Not for children, and not a stand-alone fluid prescription. Restore circulation first if there is haemodynamic compromise.",
  },
];

const CURRENT_NA_ABOVE = 145;
const TARGET_NA = { min: 135, max: 145 };
const TBW = { min: 0.3, max: 0.7 };

const litres = (v: unknown) => asNumber(v)?.toFixed(1) ?? asText(v);

function FreeWaterDeficitCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [currentNa, setCurrentNa] = useState<number | null>(null);
  const [targetNa, setTargetNa] = useState<number | null>(null);
  const [tbw, setTbw] = useState<number | null>(null);

  const valuesOk =
    inRange(weight, 0) &&
    weight > 0 &&
    inRange(currentNa, CURRENT_NA_ABOVE) &&
    currentNa > CURRENT_NA_ABOVE &&
    inRange(targetNa, TARGET_NA.min, TARGET_NA.max) &&
    inRange(tbw, TBW.min, TBW.max);
  const targetTooHigh = valuesOk && targetNa! >= currentNa!;
  const complete = context !== null && valuesOk && !targetTooHigh;
  const calc = useCalculation(
    "free_water_deficit",
    complete
      ? {
          assessment_context: context,
          weight_kg: weight,
          current_sodium_mmol_l: currentNa,
          target_sodium_mmol_l: targetNa,
          total_body_water_fraction: tbw,
        }
      : null,
  );

  return (
    <CalculatorPage
      icon={IconDropletPlus}
      title="Free-water deficit"
      badge="Hypernatraemia"
      description="Estimated positive water balance needed to move an adult's sodium from a hypernatraemic value to a chosen target (Yun 2023; Adrogue and Madias 2000). A static estimate, not a fluid prescription or correction rate."
      onReset={() => {
        setContext(null);
        setWeight(null);
        setCurrentNa(null);
        setTargetNa(null);
        setTbw(null);
      }}
      calc={calc}
      incomplete={
        targetTooHigh
          ? "The target sodium must be below the current sodium."
          : currentNa !== null && currentNa <= CURRENT_NA_ABOVE
            ? "Current sodium must be above 145 mmol/L: this estimate is for hypernatraemia."
            : weight === 0
              ? "Weight must be above zero."
              : "Confirm the context and enter every value to calculate."
      }
      form={
        <>
          <ChoiceField
            label="Assessment context"
            value={context}
            onChange={setContext}
            options={CONTEXT}
          />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Current sodium"
              hint="Above 145 mmol/L. Use a glucose-corrected value if there is substantial hyperglycaemia."
              unit="mmol/L"
              value={currentNa}
              onChange={setCurrentNa}
              min={CURRENT_NA_ABOVE}
            />
            <NumberField
              label="Target sodium"
              hint="135-145 mmol/L, and below the current sodium."
              unit="mmol/L"
              value={targetNa}
              onChange={setTargetNa}
              min={TARGET_NA.min}
              max={TARGET_NA.max}
            />
            <NumberField
              label="Weight"
              hint="Current body weight. Oedema and major fluid shifts make it a poor proxy for body water."
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={0}
              decimals={1}
            />
            <NumberField
              label="Total-body-water fraction"
              hint="0.3-0.7, chosen from clinical assessment. Common heuristics: 0.60 for a typical adult man, 0.50 for a typical adult woman, lower in older, adipose, or water-depleted adults. Enter a fraction, not a percentage."
              value={tbw}
              onChange={setTbw}
              min={TBW.min}
              max={TBW.max}
              step={0.05}
              decimals={2}
            />
          </SimpleGrid>
        </>
      }
      result={(r) => <ScoreTile value={litres(r.result)} unit="L" badge="Free-water deficit" />}
      details={(r) => (
        <Facts
          items={[
            ["Estimated total body water", `${fmt(r.working.estimated_total_body_water_l)} L`],
            ["Fraction", fmt(r.working.total_body_water_fraction, 2)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `Estimated free-water deficit ${litres(r.result)} L`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            "Adult with hypernatraemia",
            `Current sodium ${currentNa} mmol/L`,
            `Target sodium ${targetNa} mmol/L`,
            `Weight ${weight} kg`,
            `Total-body-water fraction ${tbw} (estimated total body water ${fmt(r.working.estimated_total_body_water_l)} L)`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "free_water_deficit",
  Component: FreeWaterDeficitCalculator,
};
