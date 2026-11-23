// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Text } from "@mantine/core";
import { IconRibbonHealth } from "@tabler/icons-react";

import {
  CalculatorPage,
  ChoiceField,
  Facts,
  inRange,
  NumberField,
  ScoreTile,
  asText,
  fmt,
  summaryText,
  useCalculation,
  type CalculatorModule,
  type Choice,
} from "../kit";

/** Nottingham Prognostic Index for primary operable breast cancer (Galea 1992). */

type Ordinal = "1" | "2" | "3";

const NODE_STAGE: Choice<Ordinal>[] = [
  { value: "1", label: "1 - node-negative (no positive nodes)" },
  { value: "2", label: "2 - 1 to 3 positive nodes" },
  { value: "3", label: "3 - 4 or more positive nodes" },
];

const GRADE: Choice<Ordinal>[] = [
  { value: "1", label: "Grade 1 - well differentiated" },
  { value: "2", label: "Grade 2 - moderately differentiated" },
  { value: "3", label: "Grade 3 - poorly differentiated" },
];

const GROUP_LABEL: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  "moderate-1": "Moderate I",
  "moderate-2": "Moderate II",
  poor: "Poor",
};

const labelOf = <T extends string>(options: Choice<T>[], value: T | null) =>
  options.find((o) => o.value === value)?.label ?? "";

function NpiCalculator() {
  const [size, setSize] = useState<number | null>(null);
  const [nodes, setNodes] = useState<Ordinal | null>(null);
  const [grade, setGrade] = useState<Ordinal | null>(null);

  const complete = inRange(size, 0) && size > 0 && nodes !== null && grade !== null;
  const calc = useCalculation(
    "npi",
    complete ? { tumour_size_cm: size, node_stage: Number(nodes), grade: Number(grade) } : null,
  );

  return (
    <CalculatorPage
      icon={IconRibbonHealth}
      title="Nottingham Prognostic Index"
      badge="Primary operable breast cancer"
      description="NPI = 0.2 x invasive tumour size (cm) + lymph node stage + histological grade, with the five-group prognostic classification (Galea 1992). Informs prognosis, not treatment selection on its own."
      onReset={() => {
        setSize(null);
        setNodes(null);
        setGrade(null);
      }}
      calc={calc}
      incomplete="Enter the tumour size and choose the node stage and grade to calculate."
      form={
        <>
          <NumberField
            label="Invasive tumour size"
            hint="Largest diameter of the invasive component, in centimetres (22 mm = 2.2 cm), excluding in-situ disease."
            unit="cm"
            value={size}
            onChange={setSize}
            min={0}
            decimals={1}
          />
          {size === 0 && (
            <Text size="xs" c="red">
              Tumour size must be greater than 0 cm.
            </Text>
          )}
          <ChoiceField
            label="Lymph node stage"
            hint="Translate the positive-node count to the stage; do not enter the raw count."
            value={nodes}
            onChange={setNodes}
            options={NODE_STAGE}
          />
          <ChoiceField
            label="Histological grade"
            hint="Nottingham modification of the Bloom-Richardson grade."
            value={grade}
            onChange={setGrade}
            options={GRADE}
          />
        </>
      }
      result={(r) => {
        const group = asText(r.working.prognostic_group);
        return (
          <ScoreTile
            value={fmt(r.result, 2)}
            badge={group && `${GROUP_LABEL[group] ?? group} prognostic group`}
          />
        );
      }}
      details={(r) => (
        <Facts
          items={[
            ["Size component (0.2 x cm)", fmt(r.working.size_component, 2)],
            ["Node stage", fmt(r.working.node_stage)],
            ["Grade", fmt(r.working.grade)],
          ]}
        />
      )}
      summary={(r) => {
        const group = asText(r.working.prognostic_group);
        return summaryText({
          heading: `NPI ${fmt(r.result, 2)} (${GROUP_LABEL[group] ?? group} prognostic group)`,
          interpretation: r.interpretation,
          findingsTitle: "Pathology",
          findings: [
            `Invasive tumour size ${size} cm`,
            `Lymph node stage ${labelOf(NODE_STAGE, nodes)}`,
            labelOf(GRADE, grade),
          ],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "npi", Component: NpiCalculator };
