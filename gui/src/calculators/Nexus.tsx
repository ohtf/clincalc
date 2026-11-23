// SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Badge, Group, Title } from "@mantine/core";
import { IconBone } from "@tabler/icons-react";

import {
  CalculatorPage,
  YesNoField,
  summaryText,
  useCalculation,
  type CalculatorModule,
} from "../kit";

/** NEXUS low-risk criteria for cervical-spine imaging after blunt trauma (Hoffman 2000). */

type Key =
  | "midline_cervical_tenderness"
  | "focal_neurologic_deficit"
  | "abnormal_level_of_alertness"
  | "evidence_of_intoxication"
  | "painful_distracting_injury";

const CRITERIA: Array<{ key: Key; label: string; hint?: string }> = [
  {
    key: "midline_cervical_tenderness",
    label: "Posterior midline cervical-spine tenderness",
  },
  { key: "focal_neurologic_deficit", label: "Focal neurological deficit" },
  {
    key: "abnormal_level_of_alertness",
    label: "Not a normal level of alertness",
    hint: "GCS below 15, disorientation to person, place, time, or events, inability to remember 3 objects at 5 minutes, or a delayed or inappropriate response to stimuli.",
  },
  { key: "evidence_of_intoxication", label: "Evidence of intoxication" },
  {
    key: "painful_distracting_injury",
    label: "Painful distracting injury",
    hint: "A clinically apparent, painful injury that might distract the patient from the pain of a cervical-spine injury.",
  },
];

type Criteria = Record<Key, boolean>;
const noneTicked = (): Criteria =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, false])) as Criteria;

const decisionText = (lowProbability: unknown) =>
  lowProbability === true ? "Imaging can be deferred" : "Cervical-spine imaging indicated";

function NexusCalculator() {
  const [criteria, setCriteria] = useState<Criteria>(noneTicked);
  const calc = useCalculation("nexus", criteria);

  return (
    <CalculatorPage
      icon={IconBone}
      title="NEXUS criteria"
      badge="Blunt neck trauma"
      description="Five criteria for selective cervical-spine imaging after blunt trauma: imaging can be deferred only when all five are absent (Hoffman 2000)."
      onReset={() => setCriteria(noneTicked())}
      formTitle="Tick each finding that is present"
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
        <Group justify="space-between" align="center" gap="xs" wrap="wrap">
          <Title order={2} c="teal">
            {decisionText(r.result)}
          </Title>
          <Badge color="teal" variant="light" size="lg">
            {r.working.imaging_required === false ? "All five absent" : "Criterion present"}
          </Badge>
        </Group>
      )}
      summary={(r) => {
        const present = CRITERIA.filter((c) => criteria[c.key]).map((c) => c.label);
        return summaryText({
          heading: `NEXUS: ${decisionText(r.result)}`,
          interpretation: r.interpretation,
          findingsTitle: "Criteria present",
          findings: present.length ? present : ["None of the five criteria"],
        });
      }}
    />
  );
}

export const calculator: CalculatorModule = { name: "nexus", Component: NexusCalculator };
