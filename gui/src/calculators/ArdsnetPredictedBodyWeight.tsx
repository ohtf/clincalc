// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Text } from "@mantine/core";
import { IconLungs } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** ARDSNet predicted body weight for adult lung-protective ventilation (ARDS Network 2000). */

const CONTEXT = "adult_lung_protective_ventilation_protocol_using_ardsnet_predicted_body_weight";
type Context = typeof CONTEXT;
type Branch = "male" | "female";

const CONTEXT_OPTIONS: Choice<Context>[] = [
  {
    value: CONTEXT,
    label: "Adult aged 18 or over, within a clinician-directed lung-protective ventilation protocol that uses ARDSNet PBW",
    hint: "Not for children, and not a prescription of tidal volume or ventilator settings.",
  },
];

const BRANCHES: Choice<Branch>[] = [
  { value: "male", label: "Male", hint: "50.0 kg at 60 inches, plus 2.3 kg per inch." },
  { value: "female", label: "Female", hint: "45.5 kg at 60 inches, plus 2.3 kg per inch." },
];

const INTERCEPT: Record<Branch, number> = { male: 50.0, female: 45.5 };
const TABLE_CM = { min: 121.92, max: 213.36 };

/** The engine rejects a height and branch that derive a non-positive PBW. */
const derivesPositive = (heightCm: number, branch: Branch) =>
  INTERCEPT[branch] + 2.3 * (heightCm / 2.54 - 60) > 0;

function ArdsnetPredictedBodyWeightCalculator() {
  const [context, setContext] = useState<Context | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);

  const heightValid = height !== null && Number.isFinite(height) && height > 0;
  const tooShort = heightValid && branch !== null && !derivesPositive(height, branch);
  const outsideTable = heightValid && (height < TABLE_CM.min || height > TABLE_CM.max);
  const complete = context !== null && heightValid && branch !== null && !tooShort;
  const calc = useCalculation(
    "ardsnet_predicted_body_weight",
    complete ? { assessment_context: context, height_cm: height, formula_branch: branch } : null,
  );

  return (
    <CalculatorPage
      icon={IconLungs}
      title="ARDSNet predicted body weight"
      badge="Adult ventilation"
      description="Predicted body weight for adult lung-protective ventilation protocols (NIH-NHLBI ARDS Network). PBW is not actual, ideal, adjusted, or drug-dosing weight, and actual weight must not substitute where PBW is required."
      onReset={() => {
        setContext(null);
        setHeight(null);
        setBranch(null);
      }}
      calc={calc}
      incomplete="Confirm the context, then enter measured height and the protocol's coefficient branch to calculate."
      form={
        <>
          <ChoiceField
            label="Context"
            value={context}
            onChange={setContext}
            options={CONTEXT_OPTIONS}
          />
          <NumberField
            label="Measured height"
            hint="Measured adult height in centimetres; it is converted to inches by dividing by 2.54. The official ARDSNet table covers 121.92-213.36 cm; outside it the result is an unclamped extrapolation."
            unit="cm"
            value={height}
            onChange={setHeight}
            min={0}
            decimals={1}
          />
          {tooShort && (
            <Text size="xs" c="red">
              This height gives a predicted body weight of zero or less on the {branch} branch, so
              it cannot be calculated. Check the measurement and unit.
            </Text>
          )}
          {outsideTable && !tooShort && (
            <Text size="xs" c="orange">
              Outside the official table range (121.92-213.36 cm): the result will be an
              extrapolation. Verify the measured height.
            </Text>
          )}
          <ChoiceField
            label="ARDSNet coefficient branch"
            hint="The historical male or female branch the governing protocol requires. Verify it clinically; it is not inferred from name, appearance, or gender identity."
            value={branch}
            onChange={setBranch}
            options={BRANCHES}
          />
        </>
      }
      result={(r) => (
        <ScoreTile
          value={fmt(r.result)}
          unit="kg"
          badge={
            r.working.outside_official_reference_table_range === true
              ? "outside reference table - extrapolated"
              : "predicted body weight"
          }
        />
      )}
      details={(r) => (
        <Facts
          items={[
            ["Height", `${fmt(r.working.height_cm)} cm (${fmt(r.working.height_inches, 1)} in)`],
            ["Branch", asText(r.working.formula_branch)],
            ["Formula", asText(r.working.formula)],
          ]}
        />
      )}
      summary={(r) =>
        summaryText({
          heading: `ARDSNet predicted body weight ${fmt(r.result)} kg (${branch} branch${
            r.working.outside_official_reference_table_range === true
              ? "; height outside the reference table, extrapolated"
              : ""
          })`,
          interpretation: r.interpretation,
          findingsTitle: "Inputs",
          findings: [
            `Measured height ${height} cm (${fmt(r.working.height_inches, 1)} in)`,
            `Coefficient branch: ${branch}`,
            "Context: adult, within a clinician-directed lung-protective ventilation protocol using ARDSNet PBW",
          ],
        })
      }
    />
  );
}

export const calculator: CalculatorModule = {
  name: "ardsnet_predicted_body_weight",
  Component: ArdsnetPredictedBodyWeightCalculator,
};
