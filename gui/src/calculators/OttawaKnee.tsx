// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Title } from "@mantine/core";
import { IconFootsteps } from "@tabler/icons-react";

import {
  CalculatorPage,
  YesNoField,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** Ottawa Knee Rule for knee radiography after acute knee injury (Stiell 1995). */

type Key =
  | "age_55_or_over"
  | "isolated_patellar_tenderness"
  | "tenderness_at_fibular_head"
  | "unable_to_flex_knee_90_degrees"
  | "unable_to_bear_weight_four_steps";

const CRITERIA: Array<{ key: Key; label: string; hint?: string }> = [
  { key: "age_55_or_over", label: "Age 55 or over" },
  {
    key: "isolated_patellar_tenderness",
    label: "Isolated tenderness of the patella",
    hint: "No bone tenderness of the knee other than the patella.",
  },
  { key: "tenderness_at_fibular_head", label: "Tenderness at the head of the fibula" },
  { key: "unable_to_flex_knee_90_degrees", label: "Unable to flex the knee to 90 degrees" },
  {
    key: "unable_to_bear_weight_four_steps",
    label: "Unable to bear weight for 4 steps",
    hint: "Both immediately after the injury and in the emergency department or clinic, regardless of limping.",
  },
];

type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const decisionText = (xrayIndicated: unknown) =>
  xrayIndicated === true ? "Knee radiographs indicated" : "Knee radiographs not indicated by the rule";

function OttawaKneeCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("ottawa_knee", criteria);

  return (
    <CalculatorPage
      icon={IconFootsteps}
      title="Ottawa Knee Rule"
      badge="Acute knee injury"
      description="Selective knee radiography after acute knee injury: any one criterion indicates a knee series (Stiell 1995). Validated for adults aged 18 and over; not for children."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each criterion that is present"
      calc={calc}
      form={
        <>
          {CRITERIA.map((c) => (
            <YesNoField
              key={c.key}
              label={c.label}
              hint={c.hint}
              checked={criteria[c.key]}
              onChange={(checked) => setCriteria((prev) => ({ ...prev, [c.key]: checked }))}
            />
          ))}
        </>
      }
      result={(r) => (
        <Title order={2} c="teal">
          {decisionText(r.result)}
        </Title>
      )}
      summary={(r) => {
        const present = CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `Ottawa Knee Rule: ${decisionText(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: present.length ? present : ["None of the five criteria"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "ottawa_knee", Component: OttawaKneeCalculator };
