// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { IconVaccine } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  inRange,
  NumberField,
  ScoreTile,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Weight-based unfractionated heparin nomogram (Raschke, Ann Intern Med 1993). */

type Mode = "initial" | "adjust";

const MODES: Choice<Mode>[] = [
  {
    value: "initial",
    label: "Initial dose",
    hint: "Before the first aPTT: weight-based bolus and starting infusion.",
  },
  {
    value: "adjust",
    label: "Adjust from an aPTT result",
    hint: "Nomogram adjustment from the aPTT ratio and the current infusion rate.",
  },
];

const WEIGHT = { min: 20, max: 300 };
const APTT_RATIO = { min: 0.3, max: 10 };
const RATE = { min: 0, max: 50 };

function HeparinNomogramCalculator() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [apttRatio, setApttRatio] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);

  const weightOk = inRange(weight, WEIGHT.min, WEIGHT.max);
  const complete =
    mode === "initial"
      ? weightOk
      : mode === "adjust" &&
        weightOk &&
        inRange(apttRatio, APTT_RATIO.min, APTT_RATIO.max) &&
        inRange(rate, RATE.min, RATE.max);
  const input =
    mode === "adjust"
      ? { weight_kg: weight, aptt_ratio: apttRatio, current_infusion_rate_units_kg_hr: rate }
      : { weight_kg: weight };
  const calc = useCalculation("heparin_nomogram", complete ? input : null);

  return (
    <CalculatorPage
      icon={IconVaccine}
      title="Heparin nomogram"
      badge="Unfractionated heparin"
      description="Weight-based unfractionated heparin dosing: initial bolus and infusion, and aPTT-ratio-guided adjustment (Raschke 1993). A calculation aid for one published nomogram; many hospitals use a local nomogram or anti-Xa monitoring, so check local protocol."
      onReset={() => {
        setMode(null);
        setWeight(null);
        setApttRatio(null);
        setRate(null);
      }}
      calc={calc}
      incomplete={
        mode === null
          ? "Choose initial dose or adjustment, then enter the values."
          : mode === "initial"
            ? "Enter the patient's weight to calculate."
            : "Enter weight, aPTT ratio, and the current infusion rate to calculate."
      }
      form={
        <>
          <ChoiceField label="Calculation" value={mode} onChange={setMode} options={MODES} />
          <SimpleGrid cols={2} spacing="md">
            <NumberField
              label="Weight"
              unit="kg"
              value={weight}
              onChange={setWeight}
              min={WEIGHT.min}
              max={WEIGHT.max}
              decimals={1}
            />
          </SimpleGrid>
          {mode === "adjust" && (
            <SimpleGrid cols={2} spacing="md">
              <NumberField
                label="aPTT ratio"
                hint="aPTT as a ratio to the laboratory control."
                unit="x control"
                value={apttRatio}
                onChange={setApttRatio}
                min={APTT_RATIO.min}
                max={APTT_RATIO.max}
                decimals={2}
              />
              <NumberField
                label="Current infusion rate"
                hint="Per kg, as currently running."
                unit="units/kg/hr"
                value={rate}
                onChange={setRate}
                min={RATE.min}
                max={RATE.max}
              />
            </SimpleGrid>
          )}
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result, 0)}
          unit="units/hr"
          badge={
            r.working.adjusted_infusion_rate_units_hr !== undefined
              ? "New infusion rate"
              : "Initial infusion rate"
          }
        />
      )}
      summary={(r) =>
        summaryText({
          heading:
            r.working.adjusted_infusion_rate_units_hr !== undefined
              ? `Heparin nomogram adjustment: new infusion rate about ${fmt(r.result, 0)} units/hr`
              : `Heparin nomogram initial dose: infusion ${fmt(r.result, 0)} units/hr`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Weight ${weight} kg`,
            mode === "adjust" && `aPTT ratio ${apttRatio} x control`,
            mode === "adjust" && `Current infusion rate ${rate} units/kg/hr`,
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "heparin_nomogram",
  Component: HeparinNomogramCalculator,
};
